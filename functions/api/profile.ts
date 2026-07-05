import { getSessionCookie, verifySession, type Env } from "../lib/auth";
import { xpProgress } from "../lib/xp";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userRow = await env.DB.prepare("SELECT xp FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ xp: number }>();

  const waveRow = await env.DB.prepare(
    "SELECT COALESCE(MAX(launch_wave), 0) as wave FROM species WHERE is_active = 1"
  ).first<{ wave: number }>();
  const currentWave = waveRow?.wave ?? 0;

  const speciesTotalRow = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM species WHERE launch_wave <= ? AND launch_wave > 0"
  )
    .bind(currentWave)
    .first<{ count: number }>();

  const speciesDiscoveredRow = await env.DB.prepare(
    "SELECT COUNT(DISTINCT species_id) as count FROM discoveries WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ count: number }>();

  const totalDiscoveriesRow = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM discoveries WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ count: number }>();

  const { results: rarityBreakdown } = await env.DB.prepare(
    `SELECT rarity_tiers.slug as slug, rarity_tiers.name as name, COUNT(*) as count
     FROM discoveries
     JOIN rarity_tiers ON rarity_tiers.id = discoveries.rarity_tier_id
     WHERE discoveries.user_id = ?
     GROUP BY rarity_tiers.id
     ORDER BY rarity_tiers.sort_order`
  )
    .bind(user.id)
    .all<{ slug: string; name: string; count: number }>();

  const speciesDiscoveredCount = speciesDiscoveredRow?.count ?? 0;
  const totalDiscoveries = totalDiscoveriesRow?.count ?? 0;
  const duplicateCount = Math.max(0, totalDiscoveries - speciesDiscoveredCount);

  const progress = xpProgress(userRow?.xp ?? 0);

  return Response.json({
    user,
    xp: userRow?.xp ?? 0,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    speciesDiscoveredCount,
    speciesTotalCount: speciesTotalRow?.count ?? 0,
    totalDiscoveries,
    duplicateCount,
    rarityBreakdown,
  });
};
