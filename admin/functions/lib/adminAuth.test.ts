import { describe, it, expect, vi } from "vitest";
import { authorize, isSameOrigin, hasRole, type AdminRole } from "./adminAuth";

function makeDb(opts: { session?: boolean; role?: string | null } = {}) {
  const { session = true, role = "admin" } = opts;
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first<T>() {
          if (sql.includes("FROM sessions")) {
            return session
              ? ({ id: 7, email: "a@a.com", display_name: "A", xp: 0, avatar: null, expires_at: Date.now() + 1e6 } as unknown as T)
              : null;
          }
          if (sql.includes("SELECT role")) return (role === null ? null : { role }) as unknown as T;
          return null;
        },
        run: vi.fn(async () => ({})),
      };
    },
  } as unknown as D1Database;
}

const req = (method = "GET", headers: Record<string, string> = {}) =>
  new Request("https://admin.example.com/api/admin/x", { method, headers: { Cookie: "ecorex_session=abc", ...headers } });

describe("hasRole", () => {
  it("admin passes any requirement", () => {
    expect(hasRole("admin", ["art_editor"])).toBe(true);
  });
  it("editors only pass their own area", () => {
    expect(hasRole("art_editor", ["art_editor"])).toBe(true);
    expect(hasRole("art_editor", ["content_editor"])).toBe(false);
  });
  it("players and unknown roles never pass", () => {
    expect(hasRole("player", ["admin"])).toBe(false);
    expect(hasRole("whatever", [] as AdminRole[])).toBe(false);
  });
});

describe("isSameOrigin", () => {
  it("accepts a matching Origin", () => {
    expect(isSameOrigin(req("POST", { Origin: "https://admin.example.com" }))).toBe(true);
  });
  it("rejects a foreign Origin", () => {
    expect(isSameOrigin(req("POST", { Origin: "https://evil.example" }))).toBe(false);
  });
  it("rejects a missing Origin on mutations", () => {
    expect(isSameOrigin(req("POST"))).toBe(false);
  });
});

describe("authorize", () => {
  it("401 without a session cookie", async () => {
    const r = await authorize(makeDb(), new Request("https://admin.example.com/api/admin/x"), ["admin"]);
    expect(r instanceof Response && r.status).toBe(401);
  });
  it("401 with an unknown/expired session", async () => {
    const r = await authorize(makeDb({ session: false }), req(), ["admin"]);
    expect(r instanceof Response && r.status).toBe(401);
  });
  it("403 for a plain player", async () => {
    const r = await authorize(makeDb({ role: "player" }), req(), ["admin"]);
    expect(r instanceof Response && r.status).toBe(403);
  });
  it("403 for an editor of another area", async () => {
    const r = await authorize(makeDb({ role: "content_editor" }), req(), ["art_editor"]);
    expect(r instanceof Response && r.status).toBe(403);
  });
  it("returns the user and role when allowed", async () => {
    const r = await authorize(makeDb({ role: "art_editor" }), req(), ["art_editor"]);
    expect(r instanceof Response).toBe(false);
    if (!(r instanceof Response)) expect(r).toMatchObject({ role: "art_editor", user: { id: 7 } });
  });
  it("403 on a mutation from another origin even for an admin", async () => {
    const r = await authorize(makeDb(), req("POST", { Origin: "https://evil.example" }), ["admin"]);
    expect(r instanceof Response && r.status).toBe(403);
  });
  it("allows an admin mutation from the same origin", async () => {
    const r = await authorize(makeDb(), req("POST", { Origin: "https://admin.example.com" }), ["admin"]);
    expect(r instanceof Response).toBe(false);
  });
});
