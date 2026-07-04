import { getSessionCookie, verifySession } from "../../lib/auth";

interface Env {
  DB: D1Database;
}

interface EligibleRow {
  species_id: number;
  common_name: string;
  scientific_name: string;
  calma_anchor_url: string;
  calma_count: number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT
       species.id as species_id,
       species.common_name as common_name,
       species.scientific_name as scientific_name,
       species_phase_anchors.image_url as calma_anchor_url,
       COUNT(*) as calma_count
     FROM discoveries
     JOIN species ON species.id = discoveries.species_id
     JOIN species_phase_anchors ON species_phase_anchors.species_id = species.id AND species_phase_anchors.phase = 'calma'
     WHERE discoveries.user_id = ? AND discoveries.phase = 'calma' AND discoveries.consumed_at IS NULL
     GROUP BY species.id
     HAVING COUNT(*) >= 5`
  )
    .bind(user.id)
    .all<EligibleRow>();

  return Response.json({
    eligible: results.map((row) => ({
      speciesId: row.species_id,
      commonName: row.common_name,
      scientificName: row.scientific_name,
      calmaAnchorUrl: row.calma_anchor_url,
      calmaCount: row.calma_count,
    })),
  });
};
