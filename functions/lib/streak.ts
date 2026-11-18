import { D1Database } from '@cloudflare/workers-types';

// Daily streak: consecutive calendar days (Spain time, see todayInSpain) with
// any activity. It is derived from `daily_missions`, which gets a row the first
// time a player percibe/fuses on a given day — so no extra table or migration.
// A streak that hasn't been extended yet today is still alive (the player has
// until midnight), it just reports `activeToday: false`.

const STREAK_LOOKBACK_DAYS = 120;

// Rewards at day 3, day 7 and every 7 days after that. Each also refills
// energy (see recordDiscovery). Kept in code, like mission rewards.
export const STREAK_FIRST_MILESTONE = 3;
export const STREAK_WEEKLY_INTERVAL = 7;
const STREAK_REWARD_XP: Record<number, number> = { 3: 20, 7: 50 };
const STREAK_WEEKLY_REWARD_XP = 50;

export interface StreakState {
  days: number;
  activeToday: boolean;
  nextMilestone: number;
  nextMilestoneXp: number;
}

/** 'YYYY-MM-DD' shifted by `delta` days (pure calendar arithmetic, no timezone). */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function streakRewardXp(days: number): number | null {
  if (days <= 0) return null;
  if (STREAK_REWARD_XP[days] !== undefined) return STREAK_REWARD_XP[days];
  if (days > STREAK_WEEKLY_INTERVAL && days % STREAK_WEEKLY_INTERVAL === 0) return STREAK_WEEKLY_REWARD_XP;
  return null;
}

export function nextStreakMilestone(days: number): number {
  if (days < STREAK_FIRST_MILESTONE) return STREAK_FIRST_MILESTONE;
  if (days < STREAK_WEEKLY_INTERVAL) return STREAK_WEEKLY_INTERVAL;
  return (Math.floor(days / STREAK_WEEKLY_INTERVAL) + 1) * STREAK_WEEKLY_INTERVAL;
}

/** Pure: given the set of active days, how long is the streak as of `today`. */
export function computeStreak(activeDays: Iterable<string>, today: string): { days: number; activeToday: boolean } {
  const set = new Set(activeDays);
  const activeToday = set.has(today);
  let cursor = activeToday ? today : shiftDay(today, -1);
  let days = 0;
  while (set.has(cursor)) {
    days += 1;
    cursor = shiftDay(cursor, -1);
  }
  return { days, activeToday };
}

export async function getStreak(db: D1Database, userId: number, today: string): Promise<StreakState> {
  const { results } = await db
    .prepare('SELECT DISTINCT day FROM daily_missions WHERE user_id = ? AND day <= ? ORDER BY day DESC LIMIT ?')
    .bind(userId, today, STREAK_LOOKBACK_DAYS)
    .all<{ day: string }>();

  const { days, activeToday } = computeStreak(
    results.map((row) => row.day),
    today
  );
  const nextMilestone = nextStreakMilestone(days);
  return { days, activeToday, nextMilestone, nextMilestoneXp: streakRewardXp(nextMilestone) ?? 0 };
}

/**
 * Grants today's streak milestone at most once. Idempotency lives in the
 * notifications inbox (which is also how the player sees the reward), so no
 * schema change is needed. Returns the xp awarded, or null.
 */
export async function claimStreakReward(
  db: D1Database,
  userId: number,
  today: string,
  streak: StreakState
): Promise<{ days: number; xp: number } | null> {
  if (!streak.activeToday) return null;
  const xp = streakRewardXp(streak.days);
  if (xp === null) return null;

  const already = await db
    .prepare(
      `SELECT id FROM notifications
       WHERE user_id = ? AND type = 'streak_reward' AND json_extract(payload, '$.day') = ?`
    )
    .bind(userId, today)
    .first<{ id: number }>();
  if (already) return null;

  await db
    .prepare(`INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)`)
    .bind(userId, 'streak_reward', JSON.stringify({ day: today, days: streak.days, xp }))
    .run();
  return { days: streak.days, xp };
}
