// Fetches real paleontological data from the Paleobiology Database
// (https://paleobiodb.org/data1.2/), a public API covering thousands of
// taxa — used to ground ficha-spec generation the same way
// shared/species-sources/dino-directory.mjs and dinosaur-pictures-org.mjs
// do, but with much wider coverage (NHM Dino Directory only covers ~300
// famous genera; PBDB covers most named dinosaur genera).
//
// Two entry points:
// - fetchPbdbTaxon(genus): grounding for a single known genus (taxonomy,
//   time range, validity status, fossil countries) — used by
//   lookup-species.mjs and generate-species-spec.mjs.
// - searchPbdbTaxa(criteria): discovery of candidate genera matching a
//   clade/interval/country, aggregated from occurrence records — used by
//   tools/species/discover-species-pbdb.mjs.

import { rankGenera } from './genusSearch.mjs';

const BASE_URL = 'https://paleobiodb.org/data1.2';

// PBDB answers 403 to requests without a User-Agent. Node's fetch adds one
// itself, Cloudflare Workers' does not, so it is always sent explicitly.
const REQUEST_INIT = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcorexResearchBot/1.0)' } };

export async function fetchPbdbTaxon(genus, fetchFn = fetch) {
  const taxonUrl = `${BASE_URL}/taxa/single.json?name=${encodeURIComponent(genus)}&vocab=pbdb&show=app,attr,class`;
  const taxonRes = await fetchFn(taxonUrl, REQUEST_INIT);
  if (!taxonRes.ok) return null;
  const taxonJson = await taxonRes.json();
  const record = taxonJson.records?.[0];
  if (!record) return null;

  const occsUrl = `${BASE_URL}/occs/list.json?base_name=${encodeURIComponent(genus)}&vocab=pbdb&show=loc`;
  const occsRes = await fetchFn(occsUrl, REQUEST_INIT).catch(() => null);
  const occsJson = occsRes?.ok ? await occsRes.json() : null;
  const countries = [...new Set((occsJson?.records ?? []).map((o) => o.cc).filter(Boolean))];

  return {
    taxonName: record.taxon_name,
    rank: record.taxon_rank,
    attribution: record.taxon_attr ?? null,
    isSynonym: Boolean(record.accepted_name && record.accepted_name !== record.taxon_name),
    acceptedName: record.accepted_name ?? null,
    earlyInterval: record.early_interval ?? null,
    lateInterval: record.late_interval ?? null,
    earlyMa: record.firstapp_max_ma ?? null,
    lateMa: record.lastapp_min_ma ?? null,
    nOccurrences: record.n_occs ?? null,
    classification: {
      phylum: record.phylum ?? null,
      class: record.class ?? null,
      order: record.order && record.order !== 'NO_ORDER_SPECIFIED' ? record.order : null,
      family: record.family && record.family !== 'NO_FAMILY_SPECIFIED' ? record.family : null,
    },
    countries,
  };
}

export function formatForPrompt(data) {
  if (!data) return null;
  const lines = [
    `Real paleontological data (Paleobiology Database) for ${data.taxonName}:`,
    data.attribution ? `- Named by: ${data.attribution}` : null,
    data.isSynonym ? `- Note: this name is treated as a junior synonym of ${data.acceptedName} in PBDB.` : null,
    data.earlyInterval
      ? `- Time range: ${data.earlyInterval}${data.lateInterval && data.lateInterval !== data.earlyInterval ? ` to ${data.lateInterval}` : ''}${data.earlyMa ? ` (~${data.earlyMa}-${data.lateMa} million years ago)` : ''}`
      : null,
    data.classification.order || data.classification.family
      ? `- Classification: ${[data.classification.order, data.classification.family].filter(Boolean).join(', ')}`
      : null,
    data.countries.length ? `- Fossil locations (country codes): ${data.countries.join(', ')}` : null,
    data.nOccurrences != null ? `- Documented occurrences in PBDB: ${data.nOccurrences}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

// Aggregates occurrence records into per-genus candidates for the
// discovery tool. PBDB's occs/list doesn't offer a "list of genera in this
// clade/interval/country" endpoint directly, so we fetch matching
// occurrences and roll them up client-side.
export async function searchPbdbTaxa({ baseName, interval, country, minOccurrences = 1 }, fetchFn = fetch) {
  const params = new URLSearchParams({ vocab: 'pbdb', show: 'class,loc' });
  if (baseName) params.set('base_name', baseName);
  if (interval) params.set('interval', interval);
  if (country) params.set('cc', country);

  const url = `${BASE_URL}/occs/list.json?${params.toString()}`;
  const res = await fetchFn(url, REQUEST_INIT);
  if (!res.ok) {
    if (res.status === 400) return [];
    throw new Error(`PBDB search failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const records = json.records ?? [];

  const byGenus = new Map();
  for (const r of records) {
    if (!r.genus) continue;
    // PBDB's Dinosauria clade cladistically includes Aves (birds), egg
    // form-families (name ends in "oolithidae"), and ichnofossils/trace
    // fossils (flags contains "I", e.g. footprint genera) — all irrelevant
    // noise for "give me a dinosaur candidate" discovery. Some Mesozoic
    // birds (e.g. enantiornithines like Martinavis) are filed under class
    // "Reptilia" in PBDB rather than "Aves" and can still slip through —
    // best-effort filter, not perfect.
    if (r.class === 'Aves') continue;
    if (r.family?.toLowerCase().endsWith('oolithidae')) continue;
    if (r.flags?.includes('I')) continue;
    if (!byGenus.has(r.genus)) {
      byGenus.set(r.genus, {
        genus: r.genus,
        family: r.family && r.family !== 'NO_FAMILY_SPECIFIED' ? r.family : null,
        nOccurrences: 0,
        earlyMa: null,
        lateMa: null,
        countries: new Set(),
      });
    }
    const entry = byGenus.get(r.genus);
    entry.nOccurrences += 1;
    if (r.max_ma != null) entry.earlyMa = entry.earlyMa == null ? r.max_ma : Math.max(entry.earlyMa, r.max_ma);
    if (r.min_ma != null) entry.lateMa = entry.lateMa == null ? r.min_ma : Math.min(entry.lateMa, r.min_ma);
    if (r.cc) entry.countries.add(r.cc);
  }

  return [...byGenus.values()]
    .filter((e) => e.nOccurrences >= minOccurrences)
    .map((e) => ({ ...e, countries: [...e.countries] }))
    .sort((a, b) => b.nOccurrences - a.nOccurrences);
}

// PBDB's generic taxa/auto.json autocomplete endpoint matches across ALL
// life (algae, molluscs...) ranked by occurrence count, not relevance — it
// doesn't even surface "Stegosaurus" in the top 10 results for "Steg".
// So for free-text genus search we instead fetch the full list of ~4200
// dinosaur genera once (base_name=Dinosauria&rank=genus) and cache it in
// memory, then filter that cached list by prefix — guarantees only real
// dinosaur genera show up, and is instant after the first load.
let dinosaurGenusCache = null;

async function loadDinosaurGenera(fetchFn) {
  if (dinosaurGenusCache) return dinosaurGenusCache;
  const url = `${BASE_URL}/taxa/list.json?base_name=Dinosauria&rank=genus&vocab=pbdb`;
  const res = await fetchFn(url, REQUEST_INIT);
  if (!res.ok) throw new Error(`PBDB genus list failed: ${res.status}`);
  const json = await res.json();
  dinosaurGenusCache = (json.records ?? []).map((r) => r.taxon_name).filter(Boolean).sort();
  return dinosaurGenusCache;
}

/** The full cached list of dinosaur genera (see above). */
export function listDinosaurGenera(fetchFn = fetch) {
  return loadDinosaurGenera(fetchFn);
}

// Flexible matching (anywhere in the name, typos, Spanish spellings): see genusSearch.mjs.
export async function autocompleteDinosaurGenus(prefix, fetchFn = fetch) {
  const genera = await loadDinosaurGenera(fetchFn);
  return rankGenera(genera, prefix, 15);
}
