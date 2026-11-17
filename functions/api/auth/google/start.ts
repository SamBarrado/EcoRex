import { rateLimit, getClientIp } from "../../../lib/rateLimit";
import {
  buildAuthUrl,
  pkceChallenge,
  randomToken,
  redirectUri,
  setOAuthCookie,
  type GoogleEnv,
} from "../../../lib/googleAuth";

export const onRequestGet: PagesFunction<GoogleEnv> = async (context) => {
  const { request, env } = context;

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(new URL("/login?error=google_unavailable", request.url).toString(), 302);
  }

  if (!(await rateLimit(env.RATE_LIMIT_KV, `google-start:${getClientIp(request)}`, 30))) {
    return Response.redirect(new URL("/login?error=rate_limited", request.url).toString(), 302);
  }

  const state = randomToken();
  const verifier = randomToken();
  const authUrl = buildAuthUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: redirectUri(request),
    state,
    codeChallenge: await pkceChallenge(verifier),
  });

  const secure = new URL(request.url).protocol === "https:";
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": setOAuthCookie(state, verifier, secure),
    },
  });
};
