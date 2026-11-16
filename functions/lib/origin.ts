// Defense-in-depth alongside the incidental CORS-preflight protection the
// JSON content-type already gives POST endpoints — if that
// protection ever silently disappears (e.g. a future endpoint relaxes
// content-type handling), this explicit check still catches cross-origin
// POSTs instead of relying purely on browser preflight behavior.
const ALLOWED_ORIGIN_SUFFIXES = ['.dino-discovery-generator.pages.dev'];
const ALLOWED_ORIGINS = ['https://dino-discovery-generator.pages.dev'];

// Requests with no Origin header (same-origin form posts in some older
// browsers, non-browser clients like curl/admin scripts) are allowed
// through — this check only rejects a *present* Origin that doesn't match,
// it doesn't require one to be present.
export function isAllowedOrigin(origin: string | null): boolean {
  if (origin === null) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}
