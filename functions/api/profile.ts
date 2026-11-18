import { getSessionCookie, verifySession, type Env } from "../lib/auth";
import { xpProgress, titleForLevel } from "../lib/xp";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Vocabulary (see CLAUDE.md): *species* = the creature, *phase* = Balance /
  // Exceso / Eco, *registry* = one species+phase obtained at least once (an
  // EcoDex entry), *card* = one concrete copy, *repeated* = an active copy
  // beyond the first of its registry. Only playable (active) species count, so
  // the "???" placeholder slots never hold the percentages below 100 %.
  const speciesTotalRow = await env.DB.prepare("SELECT COUNT(*) as count FROM species WHERE is_active = 1").first<{
    count: number;
  }>();

  const speciesDiscoveredRow = await env.DB.prepare(
    `SELECT COUNT(DISTINCT discoveries.species_id) as count
     FROM discoveries
     JOIN species ON species.id = discoveries.species_id AND species.is_active = 1
     WHERE discoveries.user_id = ?`
  )
    .bind(user.id)
    .first<{ count: number }>();

  const registeredTotalRow = await env.DB.prepare(
    `SELECT COUNT(*) as count
     FROM species_phase_anchors
     JOIN species ON species.id = species_phase_anchors.species_id AND species.is_active = 1`
  ).first<{ count: number }>();

  const registeredRow = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM (
       SELECT DISTINCT discoveries.species_id, discoveries.phase
       FROM discoveries
       JOIN species ON species.id = discoveries.species_id AND species.is_active = 1
       WHERE discoveries.user_id = ?
     )`
  )
    .bind(user.id)
    .first<{ count: number }>();

  // Lifetime cards obtained, including those consumed by fusions.
  const totalDiscoveriesRow = await env.DB.prepare("SELECT COUNT(*) as count FROM discoveries WHERE user_id = ?")
    .bind(user.id)
    .first<{ count: number }>();

  const repeatedRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(copies - 1), 0) as count FROM (
       SELECT COUNT(*) as copies FROM discoveries
       WHERE user_id = ? AND consumed_at IS NULL
       GROUP BY species_id, phase
     )`
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

  const progress = xpProgress(user.xp);

  return Response.json({
    user,
    xp: user.xp,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    title: titleForLevel(progress.level),
    speciesDiscoveredCount: speciesDiscoveredRow?.count ?? 0,
    speciesTotalCount: speciesTotalRow?.count ?? 0,
    registeredCount: registeredRow?.count ?? 0,
    registeredTotalCount: registeredTotalRow?.count ?? 0,
    totalDiscoveries: totalDiscoveriesRow?.count ?? 0,
    repeatedCount: repeatedRow?.count ?? 0,
    rarityBreakdown,
  });
};
