// Wikipedia article summaries (en + es) as a 4th, encyclopedic source. Works for ANY taxon,
// unlike NHM Dino Directory / dinosaurpictures.org which only know dinosaurs. It is the
// least authoritative source (PBDB and NHM are structured scientific data), so it is
// labelled as such wherever it feeds a prompt. Also yields the Spanish article text.

const UA = { 'User-Agent': 'EcorexAdmin/1.0 (internal paleontology reference tool)' };

async function fetchSummary(lang, title, fetchFn) {
  const res = await fetchFn(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: UA });
  if (!res.ok) return null;
  const json = await res.json();
  // A disambiguation page is not the taxon (the name collides with something else).
  if (json.type !== 'standard' || !json.extract) return null;
  return { lang, title: json.title, extract: json.extract, url: json.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}` };
}

export async function fetchWikipedia(genus, fetchFn = fetch) {
  const [en, es] = await Promise.all([fetchSummary('en', genus, fetchFn).catch(() => null), fetchSummary('es', genus, fetchFn).catch(() => null)]);
  if (!en && !es) return null;
  return { genus, en, es };
}

export function formatForPrompt(data) {
  if (!data) return null;
  const lines = [
    `Encyclopedic text (Wikipedia; less authoritative than PBDB/NHM data) for ${data.genus}:`,
    data.en ? `- English: ${data.en.extract}` : null,
    data.es ? `- Español: ${data.es.extract}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
