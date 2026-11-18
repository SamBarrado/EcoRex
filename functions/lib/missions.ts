import { D1Database } from '@cloudflare/workers-types';

export type MissionSlug = 'percibir' | 'coleccionista' | 'fusion';

export const MISSION_SLUGS: readonly MissionSlug[] = ['percibir', 'coleccionista', 'fusion'];

// Every mission in BONUS_SLUGS must be completable every single day with the
// daily energy budget alone (base max 3). `fusion` is deliberately optional and
// outside the bonus: a fusion eats 5 duplicates (~1.7 days of energy), so
// requiring it daily made the bonus unreachable. Slugs are fixed by the CHECK
// constraint on daily_missions, so semantics change here, not in the schema.
export const MISSION_DEFS: Record<MissionSlug, { target: number; xp: number; label: string; optional?: boolean }> = {
  percibir: { target: 1, xp: 10, label: 'Percibe hoy' },
  coleccionista: { target: 3, xp: 25, label: 'Consigue 3 cartas hoy' },
  fusion: { target: 1, xp: 20, label: 'Completa 1 fusión (extra)', optional: true },
};

export const BONUS_SLUGS: readonly MissionSlug[] = MISSION_SLUGS.filter((slug) => !MISSION_DEFS[slug].optional);

export const DAILY_BONUS_XP = 30;

// The player's "day" is the calendar day in Spain, so missions reset at local
// midnight instead of 01:00/02:00. The daily_missions.day column keeps the
// same 'YYYY-MM-DD' shape it always had.
export const MISSIONS_TIME_ZONE = 'Europe/Madrid';

export function todayInSpain(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MISSIONS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export async function incrementMission(
  db: D1Database,
  userId: number,
  slug: MissionSlug,
  day: string
): Promise<{ completedNow: boolean; progress: number }> {
  await db
    .prepare(
      `INSERT INTO daily_missions (user_id, mission_slug, day, progress_count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, mission_slug, day)
       DO UPDATE SET progress_count = progress_count + 1`
    )
    .bind(userId, slug, day)
    .run();

  const row = await db
    .prepare(
      `SELECT progress_count, completed_at FROM daily_missions
       WHERE user_id = ? AND mission_slug = ? AND day = ?`
    )
    .bind(userId, slug, day)
    .first<{ progress_count: number; completed_at: string | null }>();

  const progress = row?.progress_count ?? 0;
  const alreadyCompleted = row?.completed_at != null;
  const target = MISSION_DEFS[slug].target;

  if (!alreadyCompleted && progress >= target) {
    await db
      .prepare(
        `UPDATE daily_missions SET completed_at = datetime('now')
         WHERE user_id = ? AND mission_slug = ? AND day = ?`
      )
      .bind(userId, slug, day)
      .run();
    return { completedNow: true, progress };
  }

  return { completedNow: false, progress };
}

export async function checkAndAwardDailyBonus(db: D1Database, userId: number, day: string): Promise<boolean> {
  const { results } = await db
    .prepare(`SELECT mission_slug, completed_at FROM daily_missions WHERE user_id = ? AND day = ?`)
    .bind(userId, day)
    .all<{ mission_slug: string; completed_at: string | null }>();

  const completedSlugs = new Set(results.filter((r) => r.completed_at != null).map((r) => r.mission_slug));
  const allRequiredDone = BONUS_SLUGS.every((slug) => completedSlugs.has(slug));
  if (!allRequiredDone) return false;

  const bonusRow = await db
    .prepare(`SELECT progress_count, completed_at FROM daily_missions WHERE user_id = ? AND mission_slug = ? AND day = ?`)
    .bind(userId, 'bonus', day)
    .first<{ progress_count: number; completed_at: string | null }>();

  if (bonusRow?.completed_at != null) return false;

  await db
    .prepare(
      `INSERT INTO daily_missions (user_id, mission_slug, day, progress_count, completed_at)
       VALUES (?, 'bonus', ?, 0, datetime('now'))
       ON CONFLICT (user_id, mission_slug, day)
       DO UPDATE SET completed_at = datetime('now')`
    )
    .bind(userId, day)
    .run();

  return true;
}
