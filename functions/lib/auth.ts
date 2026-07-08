export interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
}

export interface SessionUser {
  id: number;
  email: string;
  display_name: string;
  xp: number;
}

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_COOKIE = "ecorex_session";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${PBKDF2_ITERATIONS}:${toHex(salt.buffer)}:${toHex(derivedBits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterationsStr, saltHex, hashHex] = stored.split(":");
  const iterations = parseInt(iterationsStr, 10);
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(derivedBits) === hashHex;
}

export async function createSession(db: D1Database, userId: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    )
    .bind(sessionId, userId, now, now + SESSION_TTL_MS)
    .run();
  return sessionId;
}

export async function verifySession(db: D1Database, sessionId: string): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT users.id as id, users.email as email, users.display_name as display_name, users.xp as xp, sessions.expires_at as expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .bind(sessionId)
    .first<{ id: number; email: string; display_name: string; xp: number; expires_at: number }>();

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }

  return { id: row.id, email: row.email, display_name: row.display_name, xp: row.xp };
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match ? match.slice(SESSION_COOKIE.length + 1) : null;
}

export function setSessionCookie(sessionId: string, secure: boolean): string {
  const maxAge = SESSION_TTL_MS / 1000;
  const secureAttr = secure ? " Secure;" : "";
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly;${secureAttr} SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(secure: boolean): string {
  const secureAttr = secure ? " Secure;" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly;${secureAttr} SameSite=Lax; Max-Age=0`;
}
