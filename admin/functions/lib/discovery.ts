// Species Discovery logic (pure / injectable-fetch so it is testable without
// network). Reuses shared/species-sources (also used by the CLI tools).
import { fetchPbdbTaxon, formatForPrompt as formatPbdb } from "../../../shared/species-sources/pbdb.mjs";
import { fetchDinoDirectory, formatForPrompt as formatNhm } from "../../../shared/species-sources/dino-directory.mjs";
import { fetchDinosaurPicturesOrg, formatForPrompt as formatDpo } from "../../../shared/species-sources/dinosaur-pictures-org.mjs";
import { fetchWikipedia, formatForPrompt as formatWiki } from "../../../shared/species-sources/wikipedia.mjs";
import { buildPrompt, parseModelJson, resolveFractae } from "../../../shared/species-spec/prompt.mjs";
import { hasErrors, validateSpec, type Provenance, type SpecSheet, type SpecSource } from "./specContract";

export type DraftStatus = "candidate" | "researching" | "spec_draft" | "needs_revision" | "approved" | "rejected" | "promoted";

// `promoted` is intentionally unreachable here: only the Species Manager sets it (promote.ts), and undoes it.
const TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  candidate: ["researching", "rejected"],
  researching: ["spec_draft", "rejected"],
  spec_draft: ["approved", "needs_revision", "rejected"],
  needs_revision: ["spec_draft", "rejected"],
  approved: ["needs_revision"], // reopening creates the chance of a new version; the approved one stays in history
  rejected: ["candidate"],
  promoted: [],
};

export function canTransition(from: DraftStatus, to: DraftStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Editing is blocked once approved/promoted: those versions are immutable. */
export const isEditable = (s: DraftStatus) => s === "spec_draft" || s === "needs_revision";

/** Approval needs a COMPLETE sheet: legacy gaps (warnings) are not acceptable for new species. */
export function approvalBlockers(spec: unknown): string[] {
  return validateSpec(spec).map((i) => `${i.path || "ficha"}: ${i.message}`);
}

export function sourceUrls(genus: string) {
  const g = genus.trim();
  return {
    pbdb: `https://paleobiodb.org/data1.2/taxa/single.json?name=${encodeURIComponent(g)}&vocab=pbdb&show=app,attr,class`,
    nhm: `https://www.nhm.ac.uk/discover/dino-directory/${g.toLowerCase().replace(/[^a-z]/g, "")}.html`,
    dinosaurpictures: `https://dinosaurpictures.org/${g.replace(/\s+/g, "-")}-pictures`,
    wikipediaEn: `https://en.wikipedia.org/wiki/${encodeURIComponent(g)}`,
    wikipediaEs: `https://es.wikipedia.org/wiki/${encodeURIComponent(g)}`,
  };
}

export interface ResearchResult {
  consultedAt: string;
  genus: string;
  raw: { pbdb: unknown; nhm: unknown; dinosaurpictures: unknown; wikipedia?: unknown };
  realData: string | null;
  /** One entry per source that actually answered; absent sources are not invented. */
  sources: SpecSource[];
}

export async function research(genus: string, fetchFn: typeof fetch = fetch, now = new Date()): Promise<ResearchResult> {
  const [nhm, dpo, pbdb, wiki] = await Promise.all([
    fetchDinoDirectory(genus, fetchFn).catch(() => null),
    fetchDinosaurPicturesOrg(genus, fetchFn).catch(() => null),
    fetchPbdbTaxon(genus, fetchFn).catch(() => null),
    fetchWikipedia(genus, fetchFn).catch(() => null),
  ]);
  const consultedAt = now.toISOString();
  const urls = sourceUrls(genus);
  const sources: SpecSource[] = [];
  if (pbdb) sources.push({ source: "pbdb", ref: urls.pbdb, observed: formatPbdb(pbdb) ?? undefined, consultedAt, note: pbdb.isSynonym ? `Sinónimo junior de ${pbdb.acceptedName}` : undefined });
  if (nhm) sources.push({ source: "nhm", ref: urls.nhm, observed: formatNhm(nhm) ?? undefined, consultedAt });
  if (dpo) sources.push({ source: "dinosaurpictures", ref: urls.dinosaurpictures, observed: formatDpo(dpo) ?? undefined, consultedAt, note: "Texto corroborante; sus imágenes son generadas por IA" });
  for (const w of [wiki?.en, wiki?.es]) {
    if (w) sources.push({ source: "wikipedia", ref: w.url, observed: w.extract, consultedAt, note: `Wikipedia (${w.lang}): texto enciclopédico, menos fiable que PBDB/NHM` });
  }
  // Wikipedia goes last: if sources disagree, the structured scientific ones come first in the prompt.
  const realData = [formatNhm(nhm), formatDpo(dpo), formatPbdb(pbdb), formatWiki(wiki)].filter(Boolean).join("\n\n") || null;
  return { consultedAt, genus, raw: { pbdb, nhm, dinosaurpictures: dpo, wikipedia: wiki }, realData, sources };
}

export interface AnthropicResult {
  model: string;
  fields: Record<string, unknown>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** PAID CALL. Only reached from the generate endpoint after an explicit confirmation. */
export async function callAnthropic(prompt: string, apiKey: string, model: string, fetchFn: typeof fetch = fetch): Promise<AnthropicResult> {
  const response = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`); // body omitted: never echo provider text blindly
  const data = (await response.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string; usage?: AnthropicResult["usage"] };
  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) {
    // Structural info only (no provider text): enough to diagnose max_tokens / non-text blocks.
    const types = (data.content ?? []).map((b) => b.type).join(",") || "ninguno";
    throw new Error(`Respuesta de Anthropic sin texto (stop_reason=${data.stop_reason ?? "?"}, bloques=${types})`);
  }
  return { model, fields: parseModelJson(text), usage: data.usage };
}

const asString = (v: unknown) => (typeof v === "string" ? v : "");

/** Assembles the sheet from the model's fields. Fractae-derived fields come from canon, never from the model. */
export function assembleSpec(fields: Record<string, unknown>, fractaeName: string, edition: string, prov: Provenance): SpecSheet {
  const f = resolveFractae(fractaeName);
  return {
    scientificName: asString(fields.scientificName),
    commonName: asString(fields.commonName),
    fractae: { name: f.name, latin: f.latin },
    traits: asString(fields.traits),
    habitat: asString(fields.habitat),
    palette: asString(fields.palette),
    silhouette: asString(fields.silhouette),
    closestFamousRelative: asString(fields.closestFamousRelative),
    distinguishingFromRelative: asString(fields.distinguishingFromRelative),
    oppositeFractae: f.opposite,
    lorePhrase: asString(fields.lorePhrase),
    edition,
    provenance: prov,
  };
}

export { buildPrompt, hasErrors, validateSpec };
