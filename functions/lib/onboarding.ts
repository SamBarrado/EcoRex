import { addXp, type AddXpResult } from './xp';
import { refillEnergy } from './energy';

// "Primeros pasos": a checklist with a one-off prize for NEW accounts (design
// chosen 2026-11-18). Steps are derived from real data; the two that have no
// data of their own, and the prize itself, are marked with rows in
// `notifications` (already read, so they never reach the bell) — same
// idempotency pattern as the streak reward, no migration needed.

export const ONBOARDING_REWARD_XP = 50;
/** Only accounts younger than this see the checklist: veterans never get it. */
export const ONBOARDING_WINDOW_DAYS = 14;

export const ONBOARDING_STEPS = ['account', 'pack', 'ecodex', 'push', 'mission'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingState {
  /** The account is new enough for the checklist. */
  eligible: boolean;
  /** The prize was already paid (once per account, ever). */
  rewardClaimed: boolean;
  steps: Array<{ slug: OnboardingStep; done: boolean }>;
}

async function hasNotification(db: D1Database, userId: number, type: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT id FROM notifications WHERE user_id = ? AND type = ? LIMIT 1')
    .bind(userId, type)
    .first<{ id: number }>();
  return row !== null && row !== undefined;
}

async function exists(db: D1Database, sql: string, userId: number): Promise<boolean> {
  const row = await db.prepare(sql).bind(userId).first<Record<string, unknown>>();
  return row !== null && row !== undefined;
}

export async function getOnboardingState(db: D1Database, userId: number, now: number = Date.now()): Promise<OnboardingState> {
  const user = await db
    .prepare('SELECT created_at FROM users WHERE id = ?')
    .bind(userId)
    .first<{ created_at: string }>();
  // SQLite's datetime('now') is UTC without a zone marker.
  const createdMs = user ? Date.parse(user.created_at.replace(' ', 'T') + 'Z') : NaN;
  const eligible = Number.isFinite(createdMs) && now - createdMs <= ONBOARDING_WINDOW_DAYS * 86_400_000;

  const [pack, ecodex, push, mission, rewardClaimed] = await Promise.all([
    exists(db, 'SELECT id FROM discoveries WHERE user_id = ? LIMIT 1', userId),
    hasNotification(db, userId, 'onboarding_ecodex'),
    exists(db, 'SELECT id FROM push_subscriptions WHERE user_id = ? LIMIT 1', userId),
    exists(db, "SELECT id FROM daily_missions WHERE user_id = ? AND mission_slug != 'bonus' AND completed_at IS NOT NULL LIMIT 1", userId),
    hasNotification(db, userId, 'onboarding_reward'),
  ]);

  const done: Record<OnboardingStep, boolean> = { account: true, pack, ecodex, push, mission };
  return { eligible, rewardClaimed, steps: ONBOARDING_STEPS.map((slug) => ({ slug, done: done[slug] })) };
}

/** Records that the player opened the EcoDex (idempotent). */
export async function markEcodexVisited(db: D1Database, userId: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notifications (user_id, type, payload, read_at)
       SELECT ?, 'onboarding_ecodex', NULL, datetime('now')
       WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ? AND type = 'onboarding_ecodex')`
    )
    .bind(userId, userId)
    .run();
}

export interface OnboardingReward {
  xp: AddXpResult;
}

/**
 * Pays the prize (+50 XP and full energy) once, and only if the account is
 * eligible and every step is really done. The marker row is inserted first and
 * atomically: of two concurrent claims only one gets `changes === 1`.
 */
export async function claimOnboardingReward(db: D1Database, userId: number): Promise<OnboardingReward | null> {
  const state = await getOnboardingState(db, userId);
  if (!state.eligible || state.rewardClaimed || !state.steps.every((s) => s.done)) return null;

  const inserted = await db
    .prepare(
      `INSERT INTO notifications (user_id, type, payload, read_at)
       SELECT ?, 'onboarding_reward', ?, datetime('now')
       WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = ? AND type = 'onboarding_reward')`
    )
    .bind(userId, JSON.stringify({ xp: ONBOARDING_REWARD_XP }), userId)
    .run();
  if (!inserted.meta.changes) return null;

  const xp = await addXp(db, userId, ONBOARDING_REWARD_XP);
  if (xp.leveledUp) {
    await db
      .prepare('INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)')
      .bind(userId, 'level_up', JSON.stringify({ newLevel: xp.level }))
      .run();
  }
  await refillEnergy(db, userId, xp.level);
  return { xp };
}
