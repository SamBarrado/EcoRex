import { describe, it, expect } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import {
  shiftDay,
  computeStreak,
  streakRewardXp,
  nextStreakMilestone,
  getStreak,
  claimStreakReward,
  type StreakState,
} from './streak';

describe('shiftDay', () => {
  it('moves across month, year and leap boundaries', () => {
    expect(shiftDay('2026-11-18', -1)).toBe('2026-11-17');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('computeStreak', () => {
  it('is 0 with no activity', () => {
    expect(computeStreak([], '2026-11-18')).toEqual({ days: 0, activeToday: false });
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-11-18', '2026-11-17', '2026-11-16'], '2026-11-18')).toEqual({ days: 3, activeToday: true });
  });

  it('keeps a streak alive until midnight when only yesterday is active', () => {
    expect(computeStreak(['2026-11-17', '2026-11-16'], '2026-11-18')).toEqual({ days: 2, activeToday: false });
  });

  it('breaks the streak after a missed day', () => {
    expect(computeStreak(['2026-11-16', '2026-11-15'], '2026-11-18')).toEqual({ days: 0, activeToday: false });
    expect(computeStreak(['2026-11-18', '2026-11-16', '2026-11-15'], '2026-11-18')).toEqual({ days: 1, activeToday: true });
  });

  it('crosses month boundaries and ignores duplicates', () => {
    expect(computeStreak(['2026-12-01', '2026-11-30', '2026-11-30', '2026-11-29'], '2026-12-01').days).toBe(3);
  });
});

describe('streak rewards', () => {
  it('rewards day 3, day 7 and every 7 days after', () => {
    expect(streakRewardXp(1)).toBeNull();
    expect(streakRewardXp(2)).toBeNull();
    expect(streakRewardXp(3)).toBe(20);
    expect(streakRewardXp(4)).toBeNull();
    expect(streakRewardXp(7)).toBe(50);
    expect(streakRewardXp(8)).toBeNull();
    expect(streakRewardXp(14)).toBe(50);
    expect(streakRewardXp(21)).toBe(50);
    expect(streakRewardXp(0)).toBeNull();
  });

  it('points at the next milestone', () => {
    expect(nextStreakMilestone(0)).toBe(3);
    expect(nextStreakMilestone(2)).toBe(3);
    expect(nextStreakMilestone(3)).toBe(7);
    expect(nextStreakMilestone(6)).toBe(7);
    expect(nextStreakMilestone(7)).toBe(14);
    expect(nextStreakMilestone(13)).toBe(14);
    expect(nextStreakMilestone(14)).toBe(21);
  });
});

function makeDb(opts: { days?: string[]; alreadyClaimed?: boolean }) {
  const runs: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...a: unknown[]) {
          args = a;
          return this;
        },
        async all<T>() {
          if (sql.includes('SELECT DISTINCT day FROM daily_missions')) {
            return { results: (opts.days ?? []).map((day) => ({ day })) as T[] };
          }
          return { results: [] as T[] };
        },
        async first<T>() {
          if (sql.includes("type = 'streak_reward'")) return (opts.alreadyClaimed ? { id: 1 } : null) as unknown as T;
          return null;
        },
        async run() {
          runs.push({ sql, args });
          return { meta: { last_row_id: 1 } };
        },
      };
    },
  };
  return { db: db as unknown as D1Database, runs };
}

describe('getStreak', () => {
  it('reports days, today status and the next milestone with its xp', async () => {
    const { db } = makeDb({ days: ['2026-11-18', '2026-11-17'] });
    expect(await getStreak(db, 1, '2026-11-18')).toEqual({ days: 2, activeToday: true, nextMilestone: 3, nextMilestoneXp: 20 });
  });
});

describe('claimStreakReward', () => {
  const at = (days: number, activeToday = true): StreakState => ({ days, activeToday, nextMilestone: 0, nextMilestoneXp: 0 });

  it('grants the milestone once and records it in the inbox', async () => {
    const { db, runs } = makeDb({});
    const reward = await claimStreakReward(db, 1, '2026-11-18', at(3));
    expect(reward).toEqual({ days: 3, xp: 20 });
    expect(runs).toHaveLength(1);
    expect(runs[0].args).toEqual([1, 'streak_reward', JSON.stringify({ day: '2026-11-18', days: 3, xp: 20 })]);
  });

  it('does not grant it twice on the same day', async () => {
    const { db, runs } = makeDb({ alreadyClaimed: true });
    expect(await claimStreakReward(db, 1, '2026-11-18', at(3))).toBeNull();
    expect(runs).toHaveLength(0);
  });

  it('grants nothing off-milestone or when today is not active', async () => {
    const { db, runs } = makeDb({});
    expect(await claimStreakReward(db, 1, '2026-11-18', at(4))).toBeNull();
    expect(await claimStreakReward(db, 1, '2026-11-18', at(3, false))).toBeNull();
    expect(runs).toHaveLength(0);
  });
});
