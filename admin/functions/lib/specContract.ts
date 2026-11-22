// Ficha-spec contract, shared by Species Discovery and Art Studio.
//
// The canonical shape is the one already used by tools/species/lote.json and
// produced by generate-species-spec.mjs (World Bible v7 §15.2/§15.4). This file
// only VALIDATES it; it adds no canonical fields. Traceability data lives in
// the separate, optional `provenance` block so it can't be confused with canon.
//
// Pure module (no I/O) so it can be reused by API handlers and tests. The CLI
// tooling in tools/ stays separate (it must never be imported from functions).

export const FRACTAE_CANON = [
  { name: "Alegría", latin: "Lumen", opposite: "Tristeza (Tristitia)" },
  { name: "Tristeza", latin: "Tristitia", opposite: "Alegría (Lumen)" },
  { name: "Furia", latin: "Ira", opposite: "Miedo (Pavor)" },
  { name: "Miedo", latin: "Pavor", opposite: "Furia (Ira)" },
  { name: "Confianza", latin: "Fides", opposite: "Asco (Fastidium)" },
  { name: "Asco", latin: "Fastidium", opposite: "Confianza (Fides)" },
  { name: "Sorpresa", latin: "Stupor", opposite: "Curiosidad (Spes)" },
  { name: "Curiosidad", latin: "Spes", opposite: "Sorpresa (Stupor)" },
] as const;

// World Bible v7 §15.4.4: fixed catalog; reuse, don't invent new slugs lightly.
export const HABITAT_SLUGS = [
  "bosque-abierto-templado",
  "matorral-arido",
  "riberas-humedales",
  "desierto-dunas",
  "pantano-oscuro",
  "pantano-dorado",
  "llanura-abierta",
  "costa-litoral",
  "bosque-boreal-frio",
  "volcanico",
  "valle-helado-cristal",
  "oceano-profundo",
] as const;

export interface SpecSource {
  source: "pbdb" | "nhm" | "dinosaurpictures" | "wikipedia" | "other";
  /** URL or record id of what was consulted. */
  ref: string;
  /** What was observed, verbatim or summarised. Never invented. */
  observed?: string;
  consultedAt: string; // ISO date
  /** Free-text uncertainty note; keep discrepancies instead of resolving them. */
  note?: string;
}

export interface Provenance {
  sources: SpecSource[];
  generatedBy?: { model: string; at: string };
}

export interface SpecSheet {
  scientificName: string;
  commonName: string;
  fractae: { name: string; latin: string };
  traits: string;
  palette: string;
  silhouette: string;
  habitat: string;
  closestFamousRelative: string;
  distinguishingFromRelative: string;
  edition: string;
  // Present in every curated sheet but missing in a couple of legacy ones:
  oppositeFractae?: string;
  lorePhrase?: string;
  habitatSlug?: string;
  provenance?: Provenance;
}

export interface SpecIssue {
  path: string;
  message: string;
  /** error blocks approval; warning is legacy/quality debt. */
  level: "error" | "warning";
}

const REQUIRED_STRINGS = [
  "scientificName",
  "commonName",
  "traits",
  "palette",
  "silhouette",
  "habitat",
  "closestFamousRelative",
  "distinguishingFromRelative",
] as const;

// "Genus species" or, as in the real catalog ("Tyrannosaurus rex furibundus"),
// "Genus species subspecies". The project uses invented epithets, so only the
// shape is checked, not existence.
const SCIENTIFIC_NAME = /^[A-Z][a-z]+ [a-z][a-z-]+( [a-z][a-z-]+)?$/;

export function validateSpec(input: unknown): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const err = (path: string, message: string) => issues.push({ path, message, level: "error" });
  const warn = (path: string, message: string) => issues.push({ path, message, level: "warning" });

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return [{ path: "", message: "La ficha debe ser un objeto", level: "error" }];
  }
  const s = input as Record<string, unknown>;

  for (const key of REQUIRED_STRINGS) {
    if (typeof s[key] !== "string" || !(s[key] as string).trim()) err(key, "Obligatorio (texto no vacío)");
  }
  if (typeof s.scientificName === "string" && !SCIENTIFIC_NAME.test(s.scientificName.trim())) {
    err("scientificName", 'Debe ser "Género especie" (o "Género especie subespecie")');
  }
  if (typeof s.edition !== "string") err("edition", 'Obligatorio (usa "" si no hay edición)');

  const f = s.fractae as { name?: unknown; latin?: unknown } | undefined;
  const canon = f ? FRACTAE_CANON.find((c) => c.name === f.name && c.latin === f.latin) : undefined;
  if (!canon) {
    err("fractae", `Debe ser uno de los 8 Fractae canónicos (${FRACTAE_CANON.map((c) => `${c.name}/${c.latin}`).join(", ")})`);
  } else if (s.oppositeFractae !== undefined && s.oppositeFractae !== canon.opposite) {
    err("oppositeFractae", `No coincide con el opuesto canónico (${canon.opposite})`);
  }

  if (s.habitatSlug === undefined) warn("habitatSlug", "Falta; obligatorio en fichas nuevas (World Bible v7 §15.4.4)");
  else if (!(HABITAT_SLUGS as readonly string[]).includes(s.habitatSlug as string)) {
    err("habitatSlug", "No es uno de los 12 hábitats canónicos");
  }
  if (s.lorePhrase === undefined) warn("lorePhrase", "Falta la frase de lore");
  if (s.oppositeFractae === undefined) warn("oppositeFractae", "Falta el Fractae opuesto");

  if (s.provenance !== undefined) {
    const p = s.provenance as Partial<Provenance>;
    if (!p || !Array.isArray(p.sources)) err("provenance.sources", "Debe ser una lista");
    else
      p.sources.forEach((src, i) => {
        if (!src?.ref) err(`provenance.sources[${i}].ref`, "Obligatorio: sin referencia no es una fuente");
        if (!src?.consultedAt) err(`provenance.sources[${i}].consultedAt`, "Obligatorio");
      });
  }
  return issues;
}

export const hasErrors = (issues: SpecIssue[]) => issues.some((i) => i.level === "error");

/** Folder/URL slug used by public/species-art (kebab-case of the scientific name). */
export function speciesSlug(scientificName: string): string {
  return scientificName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
