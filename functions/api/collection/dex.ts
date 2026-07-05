import { verifySession, getSessionCookie, type Env } from "../../lib/auth";

const PHASES = ["calma", "furia", "eco"] as const;

interface DiscoveryRow {
  discovery_id: number;
  discovery_code: string;
  phase: string;
  image_url: string;
  discovered_at: string;
  species_id: number;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  rarity_name: string;
}

interface SpeciesRow {
  id: number;
  launch_wave: number;
}

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

  const waveRow = await env.DB.prepare(
    `SELECT COALESCE(MAX(launch_wave), 0) as wave FROM species WHERE is_active = 1`
  ).first<{ wave: number }>();
  const currentWave = waveRow?.wave ?? 0;

  const { results: speciesRows } = await env.DB.prepare(
    `SELECT id, launch_wave FROM species WHERE launch_wave <= ? AND launch_wave > 0 ORDER BY launch_wave, id`
  )
    .bind(currentWave)
    .all<SpeciesRow>();

  const { results: discoveryRows } = await env.DB.prepare(
    `SELECT
       discoveries.id as discovery_id,
       discoveries.discovery_code as discovery_code,
       discoveries.phase as phase,
       discoveries.image_url as image_url,
       discoveries.discovered_at as discovered_at,
       species.id as species_id,
       species.scientific_name as scientific_name,
       species.common_name as common_name,
       fractae.child_name as fractae_child_name,
       rarity_tiers.name as rarity_name
     FROM discoveries
     JOIN species ON species.id = discoveries.species_id
     JOIN fractae ON fractae.id = species.fractae_id
     JOIN rarity_tiers ON rarity_tiers.id = discoveries.rarity_tier_id
     WHERE discoveries.user_id = ? AND discoveries.consumed_at IS NULL
     ORDER BY discoveries.discovered_at DESC`
  )
    .bind(user.id)
    .all<DiscoveryRow>();

  const grouped = new Map<string, { representative: DiscoveryRow; count: number }>();
  for (const row of discoveryRows) {
    const key = `${row.species_id}_${row.phase}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(key, { representative: row, count: 1 });
    }
  }

  const slots = speciesRows.flatMap((species) =>
    PHASES.map((phase) => {
      const found = grouped.get(`${species.id}_${phase}`);
      if (!found) {
        return { species_id: species.id, phase, wave: species.launch_wave, locked: true as const };
      }
      const { representative, count } = found;
      return {
        species_id: species.id,
        phase,
        wave: species.launch_wave,
        locked: false as const,
        scientific_name: representative.scientific_name,
        common_name: representative.common_name,
        fractae_child_name: representative.fractae_child_name,
        rarity_name: representative.rarity_name,
        image_url: representative.image_url,
        discovery_code: representative.discovery_code,
        discovered_at: representative.discovered_at,
        count,
      };
    })
  );

  return new Response(JSON.stringify({ currentWave, slots }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
