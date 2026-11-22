// Fetches and parses a species page from dinosaurpictures.org (plain
// server-rendered HTML, no JS framework) — used as a second, independent
// source to cross-check shared/species-sources/dino-directory.mjs (NHM). Its images are
// AI-generated (site says so itself) so they are NOT used as visual
// reference, only the textual facts (diet, period, real habitat phrasing,
// countries, reproduction).

const BASE_URL = 'https://dinosaurpictures.org';

function slugifyGenus(genus) {
  return genus.trim().replace(/\s+/g, '-');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x2F;/g, '/').replace(/\s+/g, ' ').trim();
}

export async function fetchDinosaurPicturesOrg(genus, fetchFn = fetch) {
  const slug = slugifyGenus(genus);
  const response = await fetchFn(`${BASE_URL}/${slug}-pictures`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcorexResearchBot/1.0)' },
  });
  if (!response.ok) return null;

  const html = await response.text();

  const introMatch = html.match(/<div class="intro">([\s\S]*?)<p>\s*Quick facts/);
  const intro = introMatch ? stripTags(introMatch[1]) : null;

  const factsMatch = html.match(/Quick facts about [^:]*:\s*<ul>([\s\S]*?)<\/ul>/);
  const facts = factsMatch
    ? [...factsMatch[1].matchAll(/<li>(.*?)<\/li>/gs)].map((m) => stripTags(m[1])).filter(Boolean)
    : [];

  const dietMatch = html.match(/was an? <strong>([a-z]+)<\/strong>/i);
  const periodMatch = html.match(/lived in the <a[^>]*><strong>([A-Za-z]+)<\/strong><\/a> period/);
  const regionMatch = html.match(/inhabited <strong>([A-Za-z ]+)<\/strong>/);

  return {
    genus,
    intro,
    quickFacts: facts,
    dietType: dietMatch ? dietMatch[1].toLowerCase() : null,
    period: periodMatch ? periodMatch[1] : null,
    region: regionMatch ? regionMatch[1] : null,
  };
}

export function formatForPrompt(data) {
  if (!data) return null;
  const lines = [
    `Corroborating data (dinosaurpictures.org) for ${data.genus}:`,
    data.intro ? `- Summary: ${data.intro}` : null,
    data.quickFacts?.length ? `- Quick facts: ${data.quickFacts.join('; ')}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
