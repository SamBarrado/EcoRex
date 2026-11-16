// Fetches and parses a species page from the Natural History Museum's Dino
// Directory (https://www.nhm.ac.uk/discover/dino-directory/), a real
// paleontological database — used to ground ficha-spec generation (traits,
// habitat, closestFamousRelative) in real data instead of AI-invented facts,
// which is what caused anatomy drift for lesser-known species (see
// docs/lore_world_bible_ecorex_v4.md §15.4.1).
//
// The site is a Next.js App Router page: the real data isn't in a normal
// script tag, it's embedded as a React Server Components wire-format payload
// inside `self.__next_f.push([1, "<escaped string>"])` calls. Each push
// argument is itself valid JSON (a [number, string] tuple), so we JSON.parse
// each one to get the unescaped string, then find the `"dinosaur":{...}`
// object inside it by brace-matching and JSON.parse that.

const BASE_URL = 'https://www.nhm.ac.uk/discover/dino-directory';

function slugifyGenus(genus) {
  return genus.trim().toLowerCase().replace(/[^a-z]/g, '');
}

function extractBalancedObject(text, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

function findDinosaurObject(html) {
  const pushCalls = html.matchAll(/self\.__next_f\.push\((\[1,".*?"\])\)/gs);
  for (const match of pushCalls) {
    let tuple;
    try {
      tuple = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const unescaped = tuple[1];
    const marker = '"dinosaur":{';
    const idx = unescaped.indexOf(marker);
    if (idx === -1) continue;
    const objStart = idx + '"dinosaur":'.length;
    const objText = extractBalancedObject(unescaped, objStart);
    if (!objText) continue;
    try {
      return JSON.parse(objText);
    } catch {
      continue;
    }
  }
  return null;
}

function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Returns a compact, ready-to-inject-into-a-prompt summary, or null if the
// genus isn't in the directory (it only covers ~300 named genera).
export async function fetchDinoDirectory(genus, fetchFn = fetch) {
  const slug = slugifyGenus(genus);
  const response = await fetchFn(`${BASE_URL}/${slug}.html`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcorexResearchBot/1.0)' },
  });
  if (!response.ok) return null;

  const html = await response.text();
  const d = findDinosaurObject(html);
  if (!d) return null;

  const description = d.textBlockCollection?.find((t) => t.identifier === 'detail')?.textBlock;

  return {
    genus: d.genus,
    species: d.species,
    nameMeaning: d.nameMeaning,
    namePronounciation: d.namePronounciation,
    period: d.period?.period ?? null,
    myaFrom: d.myaFrom,
    myaTo: d.myaTo,
    lengthFromMeters: d.lengthFrom,
    lengthToMeters: d.lengthTo,
    dietType: d.dietTypeName ?? d.dietType?.dietType ?? null,
    bodyShape: d.bodyShape?.bodyShape ?? null,
    bodyShapeDescription: d.bodyShape?.description ?? null,
    locomotion: d.locomotion,
    taxonomy: d.taxTaxon?.taxonomyCSV ?? null,
    countries: (d.countries ?? []).map((c) => c.country),
    description: stripHtml(description),
  };
}

export function formatForPrompt(data) {
  if (!data) return null;
  const lines = [
    `Real paleontological data (Natural History Museum Dino Directory) for ${data.genus}${data.species ? ' ' + data.species : ''}:`,
    data.nameMeaning ? `- Name meaning: "${data.nameMeaning}"` : null,
    data.period ? `- Period: ${data.period}${data.myaFrom ? ` (${data.myaFrom}-${data.myaTo} million years ago)` : ''}` : null,
    data.lengthFromMeters ? `- Length: ~${data.lengthFromMeters}${data.lengthToMeters ? `-${data.lengthToMeters}` : ''} meters` : null,
    data.dietType ? `- Diet: ${data.dietType}` : null,
    data.bodyShape ? `- Body shape category: ${data.bodyShape}${data.bodyShapeDescription ? ` (${data.bodyShapeDescription})` : ''}` : null,
    data.locomotion ? `- Locomotion: ${data.locomotion}` : null,
    data.taxonomy ? `- Taxonomy: ${data.taxonomy}` : null,
    data.countries?.length ? `- Fossil locations: ${data.countries.join(', ')}` : null,
    data.description ? `- Notes: ${data.description}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
