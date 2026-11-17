export const RARITY_GLOW: Record<string, string> = {
  registrada: "#bfe6c9",
  notable: "#4fa9e0",
  singular: "#a35fe0",
  epica: "#e0a02f",
  primordial: "#ffd54a",
};

// Rarity slugs from weakest to strongest. The position is the "tier" (0-4)
// that drives every visual ladder: frame material, foil strength, pips, the
// reveal's rings/particles.
export const RARITY_ORDER = ["registrada", "notable", "singular", "epica", "primordial"] as const;

export function rarityTierIndex(slug: string): number {
  const i = (RARITY_ORDER as readonly string[]).indexOf(slug);
  return i === -1 ? 0 : i;
}

// The DB names read "Especie Rara", "Especie Legendaria"…; the card has no room
// for the prefix, and the tier is already obvious from context.
export function shortRarityName(name: string): string {
  return name.replace(/^Especie\s+/i, "");
}

// Fractae icons live at /icons/fractae/{slug}.png and the slug is the child
// name lower-cased without accents (Furia → furia, Alegría → alegria).
export function fractaeIconUrlFromName(childName: string | undefined): string | undefined {
  if (!childName) return undefined;
  const slug = childName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return `/icons/fractae/${slug}.png`;
}
