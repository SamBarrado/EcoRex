import { describe, it, expect } from "vitest";
import { onRequestGet as start } from "./start";
import { onRequestGet as callback } from "./callback";

const kv = { get: async () => null, put: async () => {} };
const env = { DB: {} as D1Database, RATE_LIMIT_KV: kv, GOOGLE_CLIENT_ID: "client-1", GOOGLE_CLIENT_SECRET: "secret" };

describe("GET /api/auth/google/start", () => {
  it("redirects to Google with PKCE + state and stores them in an HttpOnly cookie", async () => {
    const response = await start({ request: new Request("https://ecorex.app/api/auth/google/start"), env } as never);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location")!);
    expect(location.origin + location.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location.searchParams.get("client_id")).toBe("client-1");
    expect(location.searchParams.get("redirect_uri")).toBe("https://ecorex.app/api/auth/google/callback");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");

    const cookie = response.headers.get("Set-Cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain(`ecorex_oauth=${location.searchParams.get("state")}.`);
  });

  it("sends the user back to /login when Google isn't configured", async () => {
    const response = await start({
      request: new Request("https://ecorex.app/api/auth/google/start"),
      env: { ...env, GOOGLE_CLIENT_ID: undefined },
    } as never);
    expect(response.headers.get("Location")).toBe("https://ecorex.app/login?error=google_unavailable");
  });
});

describe("GET /api/auth/google/callback", () => {
  it("rejects a state that doesn't match the cookie (CSRF) without touching the DB", async () => {
    const request = new Request("https://ecorex.app/api/auth/google/callback?code=abc&state=attacker", {
      headers: { Cookie: "ecorex_oauth=real-state.verifier" },
    });
    const response = await callback({ request, env } as never);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://ecorex.app/login?error=google_failed");
    expect(response.headers.get("Set-Cookie")).not.toContain("ecorex_session");
  });

  it("rejects a callback with no cookie at all", async () => {
    const request = new Request("https://ecorex.app/api/auth/google/callback?code=abc&state=s");
    const response = await callback({ request, env } as never);
    expect(response.headers.get("Location")).toBe("https://ecorex.app/login?error=google_failed");
  });

  it("reports a cancelled consent screen", async () => {
    const request = new Request("https://ecorex.app/api/auth/google/callback?error=access_denied");
    const response = await callback({ request, env } as never);
    expect(response.headers.get("Location")).toBe("https://ecorex.app/login?error=google_cancelled");
  });
});
