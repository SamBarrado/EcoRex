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
