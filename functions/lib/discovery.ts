export interface SpeciesPhaseRow {
  species_id: number;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  anchor_image_url: string;
  lore_phrase: string | null;
}

export interface RarityTierRow {
  id: number;
  slug: string;
  name: string;
  drop_weight: number;
}

export function pickRarityTier(tiers: RarityTierRow[]): RarityTierRow {
  const totalWeight = tiers.reduce((sum, tier) => sum + tier.drop_weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tier of tiers) {
    roll -= tier.drop_weight;
    if (roll <= 0) return tier;
  }
  return tiers[tiers.length - 1];
}

// Used to award the one-time "species completed" XP bonus: true once the
// user owns at least one discovery for every phase in `phases` for this
// species (regardless of how many duplicates/consumed rows exist).
export async function hasCompletedAllPhases(
  db: D1Database,
  userId: number,
  speciesId: number,
  phases: readonly string[]
): Promise<boolean> {
  const { results } = await db
    .prepare(`SELECT DISTINCT phase FROM discoveries WHERE user_id = ? AND species_id = ?`)
    .bind(userId, speciesId)
    .all<{ phase: string }>();

  const ownedPhases = new Set(results.map((row) => row.phase));
  return phases.every((phase) => ownedPhases.has(phase));
}

// Eco is a rare phase drop of Percibir (decided 2026-11-18, replacing the
// "cracks minigame" idea). The *server* decides it: the client only asks to
// percibir, otherwise anyone could POST phase=eco for a guaranteed Eco.
export const ECO_DROP_CHANCE = 0.05;

/**
 * Species an Eco card can drop for: active species whose Balance the player
 * has already registered (historically, so Balance cards consumed by a fusion
 * still count) and that have an Eco anchor. "The echo of a species you have
 * already discovered" — an Eco is never the first card of a species.
 */
export async function loadEcoEligibleSpeciesIds(db: D1Database, userId: number): Promise<number[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT discoveries.species_id as id
       FROM discoveries
       JOIN species ON species.id = discoveries.species_id AND species.is_active = 1
       JOIN species_phase_anchors a ON a.species_id = species.id AND a.phase = 'eco'
       WHERE discoveries.user_id = ? AND discoveries.phase = 'balance'`
    )
    .bind(userId)
    .all<{ id: number }>();
  return results.map((row) => row.id);
}
