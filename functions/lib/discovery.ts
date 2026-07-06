import { generateDinoVariant } from './openai';
import { storeImageInR2, type R2BucketLike } from './r2';

export interface SpeciesPhaseRow {
  species_id: number;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  physical_traits: string | null;
  base_palette: string | null;
  silhouette: string | null;
  anchor_image_url: string;
}

export interface RarityTierRow {
  id: number;
  slug: string;
  name: string;
  anchor_probability: number;
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

export function buildVariantPrompt(species: SpeciesPhaseRow, phase: string): string {
  const phaseModifier: Record<string, string> = {
    balance: 'forma estable, postura serena, brillo suave',
    exceso: 'forma intensificada, postura agresiva, brillo ardiente, grietas de energía',
    eco: 'forma translúcida, casi fantasmal, partículas dispersándose',
  };
  return [
    `A collectible cartoon dinosaur illustration for a children's app.`,
    `Species: ${species.common_name} (${species.scientific_name}).`,
    species.physical_traits ? `Physical traits: ${species.physical_traits}.` : null,
    species.base_palette ? `Palette: ${species.base_palette}.` : null,
    species.silhouette ? `Silhouette: ${species.silhouette}.` : null,
    `Fractae: ${species.fractae_child_name}.`,
    `Phase modifier (${phase}): ${phaseModifier[phase]}.`,
    `Colorful, simple, no text, no watermark.`,
  ]
    .filter(Boolean)
    .join(' ');
}

async function generateR2Key(): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(crypto.randomUUID()));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex}.png`;
}

export interface ResolvePhaseImageParams {
  species: SpeciesPhaseRow;
  phase: string;
  rarityTier: RarityTierRow;
  requestUrl: string;
  openaiApiKey: string;
  r2Bucket: R2BucketLike;
  fetchFn?: typeof fetch;
}

export interface ResolvePhaseImageResult {
  imageUrl: string;
  isUniqueVariant: boolean;
}

// Rolls anchor-vs-variant for the given rarity tier and either returns the
// curated anchor image URL, or generates a one-off AI variant over that
// anchor and stores it in R2. Throws on generation/storage failure; callers
// map that to a 502.
export async function resolvePhaseImage(params: ResolvePhaseImageParams): Promise<ResolvePhaseImageResult> {
  const { species, phase, rarityTier, requestUrl, openaiApiKey, r2Bucket, fetchFn = fetch } = params;
  const servesAnchor = Math.random() < rarityTier.anchor_probability;

  if (servesAnchor) {
    return { imageUrl: species.anchor_image_url, isUniqueVariant: false };
  }

  const anchorUrl = new URL(species.anchor_image_url, requestUrl).toString();
  const anchorResponse = await fetchFn(anchorUrl);
  if (!anchorResponse.ok) {
    throw new Error(`Failed to fetch anchor image: ${anchorResponse.status}`);
  }
  const anchorBytes = await anchorResponse.arrayBuffer();
  const prompt = buildVariantPrompt(species, phase);
  const base64Image = await generateDinoVariant(anchorBytes, prompt, openaiApiKey, fetchFn);

  const r2Key = await generateR2Key();
  await storeImageInR2(r2Bucket, r2Key, base64Image);

  return { imageUrl: `/images/${r2Key}`, isUniqueVariant: true };
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
