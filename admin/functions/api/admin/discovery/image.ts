import { pickBestImage, pickFandomImage, type CommonsPage } from "../../../lib/genusImage";
import { denyUnlessRole, jsonError, type AdminContext, type AdminEnv } from "../../../lib/adminAuth";

// Wikimedia asks automated clients for a descriptive User-Agent (and throttles generic ones).
// No personal contact is included on purpose; add one via WIKIMEDIA_CONTACT if you want to.
const userAgent = (contact?: string) => `EcorexAdmin/1.0 (internal paleontology reference tool${contact ? `; ${contact}` : ""})`;

const TTL_FOUND = 60 * 60 * 24 * 14;
const TTL_MISSING = 60 * 60 * 24; // retry later: Commons gains pictures over time

/**
 * GET ?genus=Stegosaurus — an approximate picture (life restoration / paleoart from
 * Wikimedia Commons, NOT the fossil) so a person can tell what they are choosing.
 * One Commons request per genus (plus one to Prehistoria Fandom when Commons has nothing), cached at the edge. Not a data source for the ficha.
 * Free, no key. {thumbnail:null} when nothing suitable exists or Commons is throttling.
 */
export const onRequestGet: PagesFunction<AdminEnv & { WIKIMEDIA_CONTACT?: string }, any, { admin: AdminContext }> = async ({ request, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const genus = new URL(request.url).searchParams.get("genus")?.trim();
  if (!genus || !/^[A-Za-z]{2,40}$/.test(genus)) return jsonError(400, "Género no válido");

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(`https://cache.invalid/genus-image/v2/${genus.toLowerCase()}`);
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return hit;

  const empty = { source: null, thumbnail: null, originalImage: null, pageUrl: null, title: null };
  const reply = (body: unknown, ttl: number) => {
    const res = Response.json(body, { headers: { "Cache-Control": `private, max-age=${Math.min(ttl, 86400)}` } });
    return { res, store: () => cache?.put(cacheKey, new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` } })).catch(() => {}) };
  };

  try {
    const params = new URLSearchParams({
      action: "query", format: "json", generator: "search", gsrsearch: genus, gsrnamespace: "6", gsrlimit: "30",
      prop: "imageinfo", iiprop: "url|mime", iiurlwidth: "330",
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": userAgent(env.WIKIMEDIA_CONTACT) } });
    const text = await response.text();
    let json: { query?: { pages?: Record<string, CommonsPage> } };
    try {
      json = JSON.parse(text);
    } catch {
      return Response.json({ ...empty, throttled: true }); // throttled (HTML/plain text): never cached
    }
    const pages = Object.values(json.query?.pages ?? {});
    let best = pickBestImage(pages, genus);
    if (!best) {
      // Second source: Prehistoria Fandom (es). Its API answers honest clients; failure here must not hide Commons' answer.
      const fparams = new URLSearchParams({ action: "query", format: "json", titles: genus, prop: "pageimages", piprop: "thumbnail|original", pithumbsize: "330", redirects: "1" });
      const fres = await fetch(`https://prehistoria.fandom.com/es/api.php?${fparams}`, { headers: { "User-Agent": userAgent(env.WIKIMEDIA_CONTACT) } }).catch(() => null);
      const fjson = (await fres?.json().catch(() => null)) as { query?: { pages?: Record<string, Parameters<typeof pickFandomImage>[0]> } } | null;
      best = pickFandomImage(Object.values(fjson?.query?.pages ?? {})[0], genus);
    }
    const out = reply(best ?? empty, best ? TTL_FOUND : TTL_MISSING);
    await out.store();
    return out.res;
  } catch {
    return Response.json(empty); // a missing picture must never break the search
  }
};
