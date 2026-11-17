import { setSessionCookie } from "../../../lib/auth";
import { rateLimit, getClientIp } from "../../../lib/rateLimit";
import {
  clearOAuthCookie,
  fetchGoogleProfile,
  readOAuthCookie,
  redirectUri,
  signInWithGoogle,
  type GoogleEnv,
} from "../../../lib/googleAuth";

function fail(request: Request, reason: string, secure: boolean): Response {
  const headers = new Headers({ Location: new URL(`/login?error=${reason}`, request.url).toString() });
  headers.append("Set-Cookie", clearOAuthCookie(secure));
  return new Response(null, { status: 302, headers });
}

export const onRequestGet: PagesFunction<GoogleEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const secure = url.protocol === "https:";

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return fail(request, "google_unavailable", secure);
  }
  if (!(await rateLimit(env.RATE_LIMIT_KV, `google-callback:${getClientIp(request)}`, 30))) {
    return fail(request, "rate_limited", secure);
  }

  // The user cancelled on Google's screen, or Google reported an error.
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) {
    return fail(request, "google_cancelled", secure);
  }

  // CSRF / login-fixation guard: the state we issued must come back unchanged.
  const saved = readOAuthCookie(request);
  if (!saved || saved.state !== state) {
    return fail(request, "google_failed", secure);
  }

  const profile = await fetchGoogleProfile({
    code,
    verifier: saved.verifier,
    redirectUri: redirectUri(request),
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });
  if (!profile) return fail(request, "google_failed", secure);

  const result = await signInWithGoogle(env.DB, profile);
  if (!result.ok) return fail(request, "google_failed", secure);

  const headers = new Headers({
    Location: new URL(result.needsUsernameSetup ? "/elegir-usuario" : "/inicio", request.url).toString(),
  });
  headers.append("Set-Cookie", setSessionCookie(result.sessionId, secure));
  headers.append("Set-Cookie", clearOAuthCookie(secure));
  return new Response(null, { status: 302, headers });
};
