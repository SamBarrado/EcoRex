import { rankGenera } from "../../../shared/species-sources/genusSearch.mjs";

export interface Suggestions {
  genera: string[];
  /** Where the answer came from; "wikipedia-es" = a Spanish common name resolved via Wikipedia. */
  via: "local" | "wikipedia-es" | "none";
}

const UA = (contact?: string) => `EcorexAdmin/1.0 (internal paleontology reference tool${contact ? `; ${contact}` : ""})`;

/**
 * 1) Flexible local matching over PBDB's dinosaur genera (instant, no requests).
 * 2) Only when that finds nothing: ask Spanish Wikipedia, which knows common names
 *    ("tiranosaurio" -> Tyrannosaurus). Its answers are accepted ONLY if their first
 *    word is a real dinosaur genus in PBDB's list, so novels, places etc. are dropped.
 */
export async function suggestGenera(
  query: string,
  genera: string[],
  opts: { fetchFn?: typeof fetch; contact?: string; limit?: number } = {}
): Promise<Suggestions> {
  const { fetchFn = fetch, contact, limit = 15 } = opts;
  const words = query.trim().split(/\s+/).filter(Boolean);
  // "Tyrannosaurus rex" is a scientific name (use its genus), but a short first word in a
  // multi-word text ("pico de pato") is a common name: matching just "pico" would return birds.
  const commonName = words.length > 1 && words[0].length < 6;
  if (!commonName) {
    const local = rankGenera(genera, query, limit);
    if (local.length) return { genera: local, via: "local" };
  }
  if (query.trim().length < 3) return { genera: [], via: "none" };

  try {
    const params = new URLSearchParams({ action: "opensearch", search: query.trim(), limit: "8", redirects: "resolve", format: "json" });
    const res = await fetchFn(`https://es.wikipedia.org/w/api.php?${params}`, { headers: { "User-Agent": UA(contact) } });
    const titles = ((await res.json()) as [string, string[]])[1] ?? [];
    const known = new Map(genera.map((g) => [g.toLowerCase(), g]));
    const found = [...new Set(titles.map((t) => known.get(t.split(/\s+/)[0].toLowerCase())).filter((g): g is string => !!g))].slice(0, limit);
    return found.length ? { genera: found, via: "wikipedia-es" } : { genera: [], via: "none" };
  } catch {
    return { genera: [], via: "none" }; // Wikipedia being down must not break the search box
  }
}
