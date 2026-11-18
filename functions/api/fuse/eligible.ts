import { getSessionCookie, verifySession } from "../../lib/auth";
import { levelFromXp, fusionThresholdReductionForLevel } from "../../lib/xp";

interface Env {
  DB: D1Database;
}

const BASE_FUSE_THRESHOLD = 5;

interface EligibleRow {
  species_id: number;
  common_name: string;
  scientific_name: string;
  balance_anchor_url: string;
  balance_count: number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const level = levelFromXp(user.xp);
  const fuseThreshold = BASE_FUSE_THRESHOLD - fusionThresholdReductionForLevel(level);

  const { results } = await env.DB.prepare(
    `SELECT
       species.id as species_id,
       species.common_name as common_name,
       species.scientific_name as scientific_name,
       species_phase_anchors.image_url as balance_anchor_url,
       COUNT(*) as balance_count
     FROM discoveries
     JOIN species ON species.id = discoveries.species_id
     JOIN species_phase_anchors ON species_phase_anchors.species_id = species.id AND species_phase_anchors.phase = 'balance'
     WHERE discoveries.user_id = ? AND discoveries.phase = 'balance' AND discoveries.consumed_at IS NULL
     GROUP BY species.id
     ORDER BY balance_count DESC, species.id`
  )
    .bind(user.id)
    .all<EligibleRow>();

  const toSpecies = (row: EligibleRow) => ({
    speciesId: row.species_id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    balanceAnchorUrl: row.balance_anchor_url,
    balanceCount: row.balance_count,
  });

  // `eligible` keeps its original meaning (can fuse right now); `progress` lists
  // the species with at least one Balance card that are still short, closest
  // first, so the UI can show "3/5" instead of nothing.
  return Response.json({
    threshold: fuseThreshold,
    eligible: results.filter((row) => row.balance_count >= fuseThreshold).map(toSpecies),
    progress: results.filter((row) => row.balance_count < fuseThreshold).map(toSpecies),
  });
};
