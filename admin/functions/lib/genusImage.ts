// Picks the most "what does it look like" picture of a genus from Wikimedia
// Commons search results: life restorations / paleoart first; skeletons,
// skulls, fossils, museum photos, scale charts and silhouettes are discarded.
// Pure and heuristic by design: it is only an aid for a person to tell
// candidates apart, never a data source.

export interface CommonsPage {
  title: string; // "File:Parasaurolophus walkeri.png"
  index?: number; // Commons' own relevance rank
  imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string; mime?: string }[];
}

export interface GenusImage {
  source?: "commons" | "fandom";
  thumbnail: string;
  originalImage: string;
  pageUrl: string;
  title: string;
}

const BAD =
  /skelet|skull|fossil|holotype|specimen|mount|cast\b|museum|museo|map\b|cladogram|diagram|size|scale|comparison|footprint|track|tooth|teeth|bone|vertebra|femur|humerus|jaw|quarry|locali|plate|fig\b|figure|journal|pone|silhouette|multiview|infobox|panoply|expo|parque|park|model|statue|sculpt|exhibit|zoo|display|replica|reconstructed skel|cladistic|growth|egg|nest|coprolite|skin impression|manus|pes\b|ilium|cranium|schematic|mandib|anatom|dental|section|histolog|cross-|phylogen|timeline|stratig|geolog|poster|wall|toy|lego|stamp|coin|\d{6,}/i;
const STRONG = /life[ _-]?restoration|restoration|life[ _-]?reconstruction|paleoart|palaeoart|artwork|illustration|in life|digital|painting|drawing|artist/i;
const WEAK = /reconstruction|\bart\b/i;

export function scoreTitle(title: string, genus: string): number {
  const name = title.replace(/^File:/i, "");
  if (!name.toLowerCase().includes(genus.toLowerCase())) return -1; // must be about THIS genus
  if (BAD.test(name)) return -1;
  if (/\.(svg|pdf|stl|ogg|webm|tif|tiff)$/i.test(name)) return -1; // not plain raster art
  let score = 0;
  if (STRONG.test(name)) score += 5;
  else if (WEAK.test(name)) score += 3;
  // "Genus species.png": the typical filename of an artist's restoration.
  if (new RegExp(`^${genus}[ _][a-z-]+\\.(png|jpe?g)$`, "i").test(name)) score += 2;
  if (/\.png$/i.test(name)) score += 1; // artwork is mostly PNG; museum/field photos are mostly JPG
  return score;
}

export function pickBestImage(pages: CommonsPage[], genus: string): GenusImage | null {
  let best: { page: CommonsPage; score: number } | null = null;
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.url) continue;
    const score = scoreTitle(page.title, genus);
    if (score < 2) continue; // a bare ".jpg" with no hint of being artwork isn't good enough
    // Ties go to Commons' own relevance order (lower index = more relevant).
    if (!best || score > best.score || (score === best.score && (page.index ?? 99) < (best.page.index ?? 99))) best = { page, score };
  }
  if (!best) return null;
  const info = best.page.imageinfo![0];
  return { source: "commons", thumbnail: info.thumburl!, originalImage: info.url!, pageUrl: info.descriptionurl ?? "", title: best.page.title };
}

/** True when a filename looks like a fossil/skeleton/diagram/photo rather than artwork. */
export const looksLikeNonArtwork = (filename: string) => BAD.test(filename) || /\.(svg|pdf|stl)$/i.test(filename);

/**
 * Fallback: the lead image of the genus' page on Prehistoria Fandom (es). Far less
 * curated than Commons, so it is only used when Commons has nothing suitable,
 * is labelled as such, and is still screened by filename.
 */
export function pickFandomImage(
  page: { title?: string; missing?: string; thumbnail?: { source?: string }; original?: { source?: string } } | undefined,
  genus: string
): GenusImage | null {
  const thumb = page?.thumbnail?.source;
  if (!page || page.missing !== undefined || !thumb) return null;
  const original = page.original?.source ?? thumb;
  // .../images/0/0d/Huayangosaurus.jpg/revision/latest/... -> "Huayangosaurus.jpg"
  const filename = decodeURIComponent(original.match(/\/images\/[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/i)?.[1] ?? "");
  if (filename && looksLikeNonArtwork(filename)) return null;
  return { source: "fandom", thumbnail: thumb, originalImage: original, pageUrl: `https://prehistoria.fandom.com/es/wiki/${encodeURIComponent(genus)}`, title: filename || genus };
}
