import { createSession, type Env } from "./auth";

export interface GoogleEnv extends Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export const OAUTH_COOKIE = "ecorex_oauth";
const OAUTH_COOKIE_TTL_SECONDS = 600;
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

export function redirectUri(request: Request): string {
  return `${new URL(request.url).origin}/api/auth/google/callback`;
}

export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

// The cookie carries `state.verifier`. It is only ever read back on the
// callback, which is a top-level GET navigation from Google, so SameSite=Lax
// is enough for the browser to send it.
export function setOAuthCookie(state: string, verifier: string, secure: boolean): string {
  const secureAttr = secure ? " Secure;" : "";
  return `${OAUTH_COOKIE}=${state}.${verifier}; Path=/api/auth/google; HttpOnly;${secureAttr} SameSite=Lax; Max-Age=${OAUTH_COOKIE_TTL_SECONDS}`;
}

export function clearOAuthCookie(secure: boolean): string {
  const secureAttr = secure ? " Secure;" : "";
  return `${OAUTH_COOKIE}=; Path=/api/auth/google; HttpOnly;${secureAttr} SameSite=Lax; Max-Age=0`;
}

export function readOAuthCookie(request: Request): { state: string; verifier: string } | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_COOKIE}=`));
  if (!match) return null;
  const [state, verifier] = match.slice(OAUTH_COOKIE.length + 1).split(".");
  if (!state || !verifier) return null;
  return { state, verifier };
}

export interface GoogleProfile {
  sub: string;
  email: string;
}

/**
 * Exchanges the authorization code for tokens and reads the identity from the
 * id_token. The id_token comes straight from Google's token endpoint over TLS
 * (not via the browser), so per OIDC Core §3.1.3.7 its signature does not need
 * verifying; we still check issuer, audience, expiry and email_verified.
 * Returns null if anything is off.
 */
export async function fetchGoogleProfile(params: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleProfile | null> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      code_verifier: params.verifier,
    }),
  });
  if (!response.ok) return null;

  const { id_token } = (await response.json().catch(() => ({}))) as { id_token?: string };
  const payloadPart = id_token?.split(".")[1];
  if (!payloadPart) return null;

  let claims: {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
  };
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart)));
  } catch {
    return null;
  }

  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (
    !issuerOk ||
    claims.aud !== params.clientId ||
    !claims.exp ||
    claims.exp * 1000 < Date.now() ||
    !claims.sub ||
    !claims.email ||
    !verified
  ) {
    return null;
  }

  return { sub: claims.sub, email: claims.email.trim().toLowerCase() };
}

export type GoogleSignInResult =
  | { ok: true; sessionId: string; needsUsernameSetup: boolean }
  | { ok: false };

/**
 * Finds, links or creates the user for a verified Google identity and opens a session.
 *
 *  1. Known google_sub           → log in.
 *  2. Email matches an account   → link it. The registration flow doesn't verify
 *     emails, so someone could have pre-registered this address with a password
 *     they still know. Linking therefore drops the password and every existing
 *     session: from here on the account is reachable only through Google.
 *  3. Otherwise                  → create the account (no password, placeholder
 *     username, forced through /elegir-usuario).
 */
export async function signInWithGoogle(db: D1Database, profile: GoogleProfile): Promise<GoogleSignInResult> {
  const bySub = await db
    .prepare("SELECT id, needs_username_setup FROM users WHERE google_sub = ?")
    .bind(profile.sub)
    .first<{ id: number; needs_username_setup: number }>();
  if (bySub) {
    const sessionId = await createSession(db, bySub.id);
    return { ok: true, sessionId, needsUsernameSetup: bySub.needs_username_setup === 1 };
  }

  const byEmail = await db
    .prepare("SELECT id, google_sub, needs_username_setup FROM users WHERE email = ?")
    .bind(profile.email)
    .first<{ id: number; google_sub: string | null; needs_username_setup: number }>();
  if (byEmail) {
    // Same email but already tied to a different Google account: don't merge.
    if (byEmail.google_sub) return { ok: false };
    await db.batch([
      db.prepare("UPDATE users SET google_sub = ?, password_hash = NULL WHERE id = ?").bind(profile.sub, byEmail.id),
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(byEmail.id),
    ]);
    const sessionId = await createSession(db, byEmail.id);
    return { ok: true, sessionId, needsUsernameSetup: byEmail.needs_username_setup === 1 };
  }

  const placeholder = `user_${randomToken(6).replace(/[^a-zA-Z0-9]/g, "x").slice(0, 8)}`;
  const insert = await db
    .prepare(
      "INSERT INTO users (email, password_hash, display_name, needs_username_setup, google_sub) VALUES (?, NULL, ?, 1, ?)"
    )
    .bind(profile.email, placeholder, profile.sub)
    .run();
  const sessionId = await createSession(db, insert.meta.last_row_id);
  return { ok: true, sessionId, needsUsernameSetup: true };
}
