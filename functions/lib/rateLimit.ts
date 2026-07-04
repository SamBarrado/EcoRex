export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const DEFAULT_LIMIT = 10;
const WINDOW_SECONDS = 3600;

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

// IPs are PII; hashing before use as a KV key means the raw address isn't
// sitting in plaintext in KV values/keys (visible via dashboard access,
// backups, etc.) for something that's only ever used as an opaque bucket
// identifier, never read back as an address.
async function hashIdentifier(identifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(identifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function rateLimit(
  kv: KVLike,
  identifier: string,
  limit: number = DEFAULT_LIMIT
): Promise<boolean> {
  const key = `ratelimit:${await hashIdentifier(identifier)}`;
  const raw = await kv.get(key);
  const now = Date.now();

  let record: RateLimitRecord;
  const parsed = raw ? (JSON.parse(raw) as RateLimitRecord) : null;
  const windowElapsedSeconds = parsed ? (now - parsed.windowStart) / 1000 : Infinity;

  if (parsed && windowElapsedSeconds < WINDOW_SECONDS) {
    record = parsed;
  } else {
    record = { count: 0, windowStart: now };
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  const remainingTtl = Math.max(1, Math.ceil(WINDOW_SECONDS - (now - record.windowStart) / 1000));
  await kv.put(key, JSON.stringify(record), { expirationTtl: remainingTtl });
  return true;
}

export function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}
