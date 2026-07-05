import { verifySession, getSessionCookie, type Env } from "../../lib/auth";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await verifySession(env.DB, sessionId);
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `SELECT
       discoveries.id as discovery_id,
       discoveries.discovery_code as discovery_code,
       discoveries.phase as phase,
       discoveries.image_url as image_url,
       discoveries.is_unique_variant as is_unique_variant,
       discoveries.discovered_at as discovered_at,
       species.id as species_id,
       species.scientific_name as scientific_name,
       species.common_name as common_name,
       fractae.id as fractae_id,
       fractae.slug as fractae_slug,
       fractae.child_name as fractae_child_name,
       rarity_tiers.id as rarity_tier_id,
       rarity_tiers.slug as rarity_slug,
       rarity_tiers.name as rarity_name
     FROM discoveries
     JOIN species ON species.id = discoveries.species_id
     JOIN fractae ON fractae.id = species.fractae_id
     JOIN rarity_tiers ON rarity_tiers.id = discoveries.rarity_tier_id
     WHERE discoveries.user_id = ? AND discoveries.consumed_at IS NULL
     ORDER BY discoveries.discovered_at DESC`
  )
    .bind(user.id)
    .all();

  return new Response(JSON.stringify({ discoveries: results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
