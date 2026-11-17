import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchGoogleProfile, signInWithGoogle, pkceChallenge, readOAuthCookie } from "./googleAuth";

interface UserRow {
  id: number;
  google_sub: string | null;
  needs_username_setup: number;
}

// Records every statement so tests can assert on what was (or wasn't) run.
function makeDb(rows: { bySub?: UserRow; byEmail?: UserRow }) {
  const statements: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind(...a: unknown[]) {
          args = a;
          return stmt;
        },
        async first() {
          if (sql.includes("WHERE google_sub")) return rows.bySub ?? null;
          if (sql.includes("WHERE email")) return rows.byEmail ?? null;
          return null;
        },
        async run() {
          statements.push({ sql, args });
          return { meta: { last_row_id: 99 } };
        },
        _record() {
          statements.push({ sql, args });
        },
      };
      return stmt;
    },
    async batch(stmts: { _record: () => void }[]) {
      stmts.forEach((s) => s._record());
      return [];
    },
  };
  return { db: db as unknown as D1Database, statements };
}

const profile = { sub: "google-123", email: "a@a.com" };

describe("signInWithGoogle", () => {
  it("logs in a user already linked by google_sub, touching nothing else", async () => {
    const { db, statements } = makeDb({ bySub: { id: 5, google_sub: "google-123", needs_username_setup: 0 } });
    const result = await signInWithGoogle(db, profile);
    expect(result).toMatchObject({ ok: true, needsUsernameSetup: false });
    expect(statements.some((s) => s.sql.includes("UPDATE users"))).toBe(false);
    expect(statements.some((s) => s.sql.includes("DELETE FROM sessions"))).toBe(false);
    expect(statements.filter((s) => s.sql.includes("INSERT INTO sessions"))).toHaveLength(1);
  });

  it("links an existing email account: drops the password and all old sessions", async () => {
    const { db, statements } = makeDb({ byEmail: { id: 7, google_sub: null, needs_username_setup: 0 } });
    const result = await signInWithGoogle(db, profile);
    expect(result).toMatchObject({ ok: true });
    const update = statements.find((s) => s.sql.includes("UPDATE users"));
    expect(update?.sql).toContain("password_hash = NULL");
    expect(update?.args).toEqual(["google-123", 7]);
    const del = statements.find((s) => s.sql.includes("DELETE FROM sessions"));
    expect(del?.args).toEqual([7]);
    // the old sessions are wiped before the new one is created
    const delIdx = statements.indexOf(del!);
    const newSessionIdx = statements.findIndex((s) => s.sql.includes("INSERT INTO sessions"));
    expect(delIdx).toBeLessThan(newSessionIdx);
  });

  it("refuses to merge when the email is already tied to a different Google account", async () => {
    const { db, statements } = makeDb({ byEmail: { id: 7, google_sub: "someone-else", needs_username_setup: 0 } });
    const result = await signInWithGoogle(db, profile);
    expect(result).toEqual({ ok: false });
    expect(statements).toHaveLength(0);
  });

  it("creates a new passwordless account that must pick a username", async () => {
    const { db, statements } = makeDb({});
    const result = await signInWithGoogle(db, profile);
    expect(result).toMatchObject({ ok: true, needsUsernameSetup: true });
    const insert = statements.find((s) => s.sql.includes("INSERT INTO users"));
    expect(insert?.sql).toContain("password_hash");
    expect(insert?.args[0]).toBe("a@a.com");
    expect(insert?.args[1]).toMatch(/^[a-zA-Z0-9_]{3,20}$/); // placeholder passes the username rule
    expect(insert?.args[2]).toBe("google-123");
  });
});

function idToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `header.${payload}.sig`;
}

const baseParams = {
  code: "c",
  verifier: "v",
  redirectUri: "https://x/cb",
  clientId: "client-1",
  clientSecret: "secret",
};

const goodClaims = {
  iss: "https://accounts.google.com",
  aud: "client-1",
  exp: Math.floor(Date.now() / 1000) + 3600,
  sub: "google-123",
  email: "Foo@Bar.com",
  email_verified: true,
};

function mockToken(claims: Record<string, unknown>, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ id_token: idToken(claims) }), { status: ok ? 200 : 400 }))
  );
}

describe("fetchGoogleProfile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns sub and lowercased email for a valid token", async () => {
    mockToken(goodClaims);
    expect(await fetchGoogleProfile(baseParams)).toEqual({ sub: "google-123", email: "foo@bar.com" });
  });

  it.each([
    ["unverified email", { email_verified: false }],
    ["wrong audience", { aud: "other-client" }],
    ["wrong issuer", { iss: "https://evil.example" }],
    ["expired token", { exp: Math.floor(Date.now() / 1000) - 10 }],
  ])("rejects %s", async (_name, override) => {
    mockToken({ ...goodClaims, ...override });
    expect(await fetchGoogleProfile(baseParams)).toBeNull();
  });

  it("returns null when Google rejects the code", async () => {
    mockToken(goodClaims, false);
    expect(await fetchGoogleProfile(baseParams)).toBeNull();
  });
});

describe("helpers", () => {
  it("computes the RFC 7636 S256 challenge", async () => {
    // Test vector from RFC 7636 appendix B.
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });

  it("reads state and verifier back from the cookie", () => {
    const request = new Request("https://x/cb", { headers: { Cookie: "a=b; ecorex_oauth=STATE.VERIFIER" } });
    expect(readOAuthCookie(request)).toEqual({ state: "STATE", verifier: "VERIFIER" });
    expect(readOAuthCookie(new Request("https://x/cb"))).toBeNull();
  });
});
