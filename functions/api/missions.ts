import { getSessionCookie, verifySession, type Env } from "../lib/auth";
import { getStreak } from "../lib/streak";
import { MISSION_DEFS, MISSION_SLUGS, DAILY_BONUS_XP, todayInSpain, type MissionSlug } from "../lib/missions";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const day = todayInSpain();
  const { results } = await env.DB.prepare(
    "SELECT mission_slug, progress_count, completed_at FROM daily_missions WHERE user_id = ? AND day = ?"
  )
    .bind(user.id, day)
    .all<{ mission_slug: string; progress_count: number; completed_at: string | null }>();

  const rowBySlug = new Map(results.map((r) => [r.mission_slug, r]));

  const missions = MISSION_SLUGS.map((slug: MissionSlug) => {
    const row = rowBySlug.get(slug);
    return {
      slug,
      label: MISSION_DEFS[slug].label,
      progress: row?.progress_count ?? 0,
      target: MISSION_DEFS[slug].target,
      completed: row?.completed_at != null,
      optional: MISSION_DEFS[slug].optional === true,
    };
  });

  const bonusRow = rowBySlug.get('bonus');
  const streak = await getStreak(env.DB, user.id, day);

  return Response.json({
    day,
    streak,
    missions,
    bonus: { completed: bonusRow?.completed_at != null, xp: DAILY_BONUS_XP },
  });
};
