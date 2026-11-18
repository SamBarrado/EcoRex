import { describe, it, expect } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import {
  MISSION_DEFS,
  BONUS_SLUGS,
  DAILY_BONUS_XP,
  todayInSpain,
  incrementMission,
  checkAndAwardDailyBonus,
} from './missions';

describe('constants', () => {
  it('defines the three daily missions, fusion being an optional extra', () => {
    expect(MISSION_DEFS).toEqual({
      percibir: { target: 1, xp: 10, label: 'Percibe hoy' },
      coleccionista: { target: 3, xp: 25, label: 'Consigue 3 cartas hoy' },
      fusion: { target: 1, xp: 20, label: 'Completa 1 fusión (extra)', optional: true },
    });
  });

  it('requires only the always-completable missions for the bonus (not fusion)', () => {
    expect(BONUS_SLUGS).toEqual(['percibir', 'coleccionista']);
  });

  it('keeps every bonus mission within the base daily energy budget (3)', () => {
    for (const slug of BONUS_SLUGS) {
      expect(MISSION_DEFS[slug].target).toBeLessThanOrEqual(3);
    }
  });

  it('defines the daily bonus xp', () => {
    expect(DAILY_BONUS_XP).toBe(30);
  });
});

describe('todayInSpain', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayInSpain()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rolls the day over at Spanish midnight in winter (UTC+1)', () => {
    expect(todayInSpain(new Date('2026-11-17T22:59:00Z'))).toBe('2026-11-17');
    expect(todayInSpain(new Date('2026-11-17T23:01:00Z'))).toBe('2026-11-18');
  });

  it('rolls the day over at Spanish midnight in summer (UTC+2)', () => {
    expect(todayInSpain(new Date('2026-07-07T21:59:00Z'))).toBe('2026-07-07');
    expect(todayInSpain(new Date('2026-07-07T22:01:00Z'))).toBe('2026-07-08');
  });
});

function makeMissionsDb(rows: Record<string, { progress_count: number; completed_at: string | null }>) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return this;
        },
        async first<T>() {
          if (sql.includes('SELECT progress_count, completed_at FROM daily_missions')) {
            const lastCall = calls[calls.length - 1];
            const slug = lastCall.args[1] as string;
            return (rows[slug] as unknown as T) ?? null;
          }
          return null;
        },
        async all<T>() {
          if (sql.includes('SELECT mission_slug, completed_at FROM daily_missions')) {
            return {
              results: Object.entries(rows)
                .filter(([slug]) => slug !== 'bonus')
                .map(([mission_slug, row]) => ({ mission_slug, completed_at: row.completed_at })) as T[],
            };
          }
          return { results: [] as T[] };
        },
        async run() {
          return { meta: { last_row_id: 1 } };
        },
      };
    },
    calls,
  };
  return db;
}

describe('incrementMission', () => {
  it('reports completedNow true the first time progress reaches the target', async () => {
    const db = makeMissionsDb({ fusion: { progress_count: 1, completed_at: null } });
    const result = await incrementMission(db as unknown as D1Database, 1, 'fusion', '2026-07-08');
    expect(result.completedNow).toBe(true);
    expect(result.progress).toBe(1);
  });

  it('reports completedNow false on subsequent calls after already completed', async () => {
    const db = makeMissionsDb({ fusion: { progress_count: 1, completed_at: '2026-07-08T10:00:00Z' } });
    const result = await incrementMission(db as unknown as D1Database, 1, 'fusion', '2026-07-08');
    expect(result.completedNow).toBe(false);
  });

  it('reports completedNow false while still below target', async () => {
    const db = makeMissionsDb({ coleccionista: { progress_count: 2, completed_at: null } });
    const result = await incrementMission(db as unknown as D1Database, 1, 'coleccionista', '2026-07-08');
    expect(result.completedNow).toBe(false);
    expect(result.progress).toBe(2);
  });
});

describe('checkAndAwardDailyBonus', () => {
  it('returns false when a required mission is not completed (fusion alone does not count)', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 1, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 0, completed_at: null },
      fusion: { progress_count: 1, completed_at: '2026-07-08T10:00:00Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(false);
  });

  it('returns true once percibir and coleccionista are done, without needing fusion', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 1, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 3, completed_at: '2026-07-08T10:05:00Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(true);
  });

  it('returns true the first time all three are completed and the bonus is not yet awarded', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 2, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 1, completed_at: '2026-07-08T10:05:00Z' },
      fusion: { progress_count: 1, completed_at: '2026-07-08T10:10:00Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(true);
  });

  it('returns false when the bonus was already awarded', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 2, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 1, completed_at: '2026-07-08T10:05:00Z' },
      fusion: { progress_count: 1, completed_at: '2026-07-08T10:10:00Z' },
      bonus: { progress_count: 0, completed_at: '2026-07-08T10:10:01Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(false);
  });
});
