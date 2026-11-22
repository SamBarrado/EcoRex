import { describe, it, expect, vi } from "vitest";
import { onRequest } from "./_middleware";
import { onRequestPost as login } from "./login";
import { onRequestGet as dashboard } from "./dashboard";
import { hashPassword } from "../../../../functions/lib/auth";

function makeDb(role: string | null, session = true, passwordHash: string | null = null) {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first<T>() {
          if (sql.includes("FROM sessions")) {
            return session ? ({ id: 7, email: "a@a.com", display_name: "A", xp: 0, avatar: null, expires_at: Date.now() + 1e6 } as unknown as T) : null;
          }
          if (sql.includes("SELECT role")) return (role ? { role } : null) as unknown as T;
          if (sql.includes("FROM users WHERE email")) return (role ? { id: 7, email: "a@a.com", password_hash: passwordHash, role } : null) as unknown as T;
          return null;
        },
        async all() {
          return { results: [] };
        },
        run: vi.fn(async () => ({})),
      };
    },
  } as unknown as D1Database;
}
const kv = { get: async () => null, put: async () => {} };

async function gate(path: string, db: D1Database, init: RequestInit = {}) {
  const next = vi.fn(async () => new Response("ok"));
  const request = new Request(`https://admin.example.com${path}`, { headers: { Cookie: "ecorex_session=abc" }, ...init });
  const data: Record<string, unknown> = {};
  const response = await onRequest({ request, env: { DB: db, RATE_LIMIT_KV: kv }, next, data } as never);
  return { response, next, data };
}

describe("admin middleware", () => {
  it("blocks anonymous callers on every admin route", async () => {
    const { response, next } = await gate("/api/admin/dashboard", makeDb("admin", false));
    expect(response.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
  it("blocks logged-in players", async () => {
    const { response, next } = await gate("/api/admin/species/anything", makeDb("player"));
    expect(response.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
  it("lets an admin through and exposes the context", async () => {
    const { response, next, data } = await gate("/api/admin/dashboard", makeDb("admin"));
    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalled();
    expect(data.admin).toMatchObject({ role: "admin" });
  });
  it("treats a trailing slash as the same (protected) path", async () => {
    const { response } = await gate("/api/admin/dashboard/", makeDb("player"));
    expect(response.status).toBe(403);
  });
  it("login is reachable without a session but still same-origin only", async () => {
    const ok = await gate("/api/admin/login", makeDb(null, false), { method: "POST", headers: { Origin: "https://admin.example.com" } });
    expect(ok.next).toHaveBeenCalled();
    const bad = await gate("/api/admin/login", makeDb(null, false), { method: "POST", headers: { Origin: "https://evil.example" } });
    expect(bad.response.status).toBe(403);
  });
});

describe("POST /api/admin/login", () => {
  const post = (db: D1Database, body: unknown) =>
    login({
      request: new Request("https://admin.example.com/api/admin/login", { method: "POST", body: JSON.stringify(body) }),
      env: { DB: db, RATE_LIMIT_KV: kv },
    } as never);

  it("rejects a valid player account with the same 401 as a bad password", async () => {
    const hash = await hashPassword("correct horse");
    const asPlayer = await post(makeDb("player", false, hash), { email: "a@a.com", password: "correct horse" });
    const wrongPass = await post(makeDb("admin", false, hash), { email: "a@a.com", password: "nope" });
    expect(asPlayer.status).toBe(401);
    expect(wrongPass.status).toBe(401);
    expect(await asPlayer.json()).toEqual(await wrongPass.json());
  });
  it("opens a session for an admin with the right password", async () => {
    const hash = await hashPassword("correct horse");
    const response = await post(makeDb("admin", false, hash), { email: "a@a.com", password: "correct horse" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("ecorex_session=");
  });
});

describe("GET /api/admin/dashboard", () => {
  it("returns zeros, not invented numbers, on an empty database", async () => {
    const response = await dashboard({ env: { DB: makeDb("admin") } } as never);
    expect(await response.json()).toEqual({ species: { total: 0, active: 0 }, anchorsByPhase: {} });
  });
});
