import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequest as gate } from "./_middleware";
import { onRequestGet as listDrafts, onRequestPost as createDraft } from "./drafts/index";
import { onRequestGet as getDraftH, onRequestPatch as patchDraft } from "./drafts/[id]/index";
import { onRequestPost as researchH } from "./drafts/[id]/research";
import { onRequestPost as generateH } from "./drafts/[id]/generate";
import { onRequestPost as statusH } from "./drafts/[id]/status";
import { makeD1, loginAs } from "../../lib/testD1";

const ORIGIN = "https://admin.test";
const kv = { get: async () => null, put: async () => {} };

/** Runs a handler behind the real middleware, like Pages would. */
async function call(handler: Function, db: any, cookie: string, method: string, path: string, body?: unknown, params: Record<string, string> = {}, extraEnv = {}) {
  const request = new Request(`${ORIGIN}${path}`, {
    method,
    headers: { Cookie: cookie, Origin: ORIGIN, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const ctx: any = { request, env: { DB: db, RATE_LIMIT_KV: kv, ...extraEnv }, params, data: {} };
  ctx.next = async () => handler(ctx);
  return (await gate(ctx)) as Response;
}

const FIELDS = { scientificName: "Stegosaurus pavor", commonName: "Espina Hueca", traits: "placas", habitat: "ribera", palette: "morado", silhouette: "cuadrúpedo", closestFamousRelative: "Stegosaurus", distinguishingFromRelative: "sin diferencias", lorePhrase: "lore" };

function stubFetch(anthropicCalls: { n: number }) {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url);
    if (u.includes("api.anthropic.com")) {
      anthropicCalls.n++;
      return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(FIELDS) }], usage: { input_tokens: 10, output_tokens: 20 } }));
    }
    if (u.includes("paleobiodb.org") && u.includes("taxa/single")) return new Response(JSON.stringify({ records: [{ taxon_name: "Stegosaurus", taxon_rank: "genus" }] }));
    if (u.includes("paleobiodb.org")) return new Response(JSON.stringify({ records: [] }));
    return new Response("", { status: 404 });
  });
}
afterEach(() => vi.unstubAllGlobals());

async function newDraft(db: any, cookie: string) {
  const r = await call(createDraft, db, cookie, "POST", "/api/admin/drafts", { genus: "Stegosaurus", fractae: "Miedo", edition: "Wave 2" });
  return ((await r.json()) as { id: number }).id;
}

describe("Species Discovery drafts", () => {
  it("only admin and content_editor reach the drafts; art_editor and players don't", async () => {
    for (const [role, status] of [["admin", 200], ["content_editor", 200], ["art_editor", 403], ["player", 403]] as const) {
      const db = makeD1();
      const cookie = loginAs(db, role);
      expect((await call(listDrafts, db, cookie, "GET", "/api/admin/drafts")).status).toBe(status);
    }
  });

  it("validates input and refuses duplicates", async () => {
    const db = makeD1();
    const c = loginAs(db, "content_editor");
    expect((await call(createDraft, db, c, "POST", "/api/admin/drafts", { genus: "x; drop", fractae: "Miedo" })).status).toBe(400);
    expect((await call(createDraft, db, c, "POST", "/api/admin/drafts", { genus: "Stegosaurus", fractae: "Rabia" })).status).toBe(400);
    await newDraft(db, c);
    expect((await call(createDraft, db, c, "POST", "/api/admin/drafts", { genus: "Stegosaurus", fractae: "Miedo", edition: "Wave 2" })).status).toBe(409);
  });

  it("full flow: research -> generate (confirmed) -> edit -> approve -> immutable", async () => {
    const db = makeD1();
    const c = loginAs(db, "content_editor");
    const calls = { n: 0 };
    stubFetch(calls);
    const id = await newDraft(db, c);
    const p = { id: String(id) };
    const env = { ANTHROPIC_API_KEY: "test-key", SPEC_MODEL: "test-model" };

    const res = await call(researchH, db, c, "POST", `/api/admin/drafts/${id}/research`, {}, p);
    expect(((await res.json()) as any).sources.map((s: any) => s.source)).toEqual(["pbdb"]);

    // paid call: refuses without confirm / without key, and nothing was charged
    expect((await call(generateH, db, c, "POST", `/x`, {}, p, env)).status).toBe(400);
    expect((await call(generateH, db, c, "POST", `/x`, { confirm: true }, p)).status).toBe(503);
    expect(calls.n).toBe(0);

    expect((await call(generateH, db, c, "POST", `/x`, { confirm: true }, p, env)).status).toBe(200);
    expect(calls.n).toBe(1);

    let d: any = await (await call(getDraftH, db, c, "GET", `/x`, undefined, p)).json();
    expect(d.draft.status).toBe("spec_draft");
    expect(d.draft.spec.fractae).toEqual({ name: "Miedo", latin: "Pavor" });
    expect(d.draft.spec.provenance.generatedBy.model).toBe("test-model");
    expect(d.draft.spec.provenance.sources[0].ref).toContain("paleobiodb.org");
    expect(d.versions).toHaveLength(1);

    // approving now is blocked: habitatSlug is a human decision
    const blocked = await call(statusH, db, c, "POST", `/x`, { to: "approved" }, p);
    expect(blocked.status).toBe(422);
    expect(((await blocked.json()) as any).blockers.join()).toContain("habitatSlug");

    // human edit -> version 2
    const edited = { ...d.draft.spec, habitatSlug: "pantano-oscuro" };
    expect((await call(patchDraft, db, c, "PATCH", `/x`, { spec: edited, note: "hábitat" }, p)).status).toBe(200);
    expect((await call(statusH, db, c, "POST", `/x`, { to: "approved" }, p)).status).toBe(200);

    // approved is immutable and can't be re-generated
    expect((await call(patchDraft, db, c, "PATCH", `/x`, { spec: edited }, p)).status).toBe(409);
    expect((await call(generateH, db, c, "POST", `/x`, { confirm: true }, p, env)).status).toBe(409);
    d = await (await call(getDraftH, db, c, "GET", `/x`, undefined, p)).json();
    expect(d.versions.map((v: any) => v.version)).toEqual([2, 1]);
    expect(d.versions.map((v: any) => v.origin)).toEqual(["human", "ai"]);

    const audit = db.sqlite.prepare("SELECT action FROM admin_audit_log ORDER BY id").all().map((r: any) => r.action);
    expect(audit).toEqual(["draft.create", "draft.research", "draft.generate", "draft.edit", "draft.approved"]);
  });

  it("non-dinosaur drafts store their group, are validated, and the prompt carries the group notice", async () => {
    const db = makeD1();
    const c = loginAs(db, "content_editor");
    const bodies: string[] = [];
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      if (String(u).includes("api.anthropic.com")) { bodies.push(String(init?.body)); return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(FIELDS) }] })); }
      return new Response("", { status: 404 });
    });
    expect((await call(createDraft, db, c, "POST", "/api/admin/drafts", { genus: "Quetzalcoatlus", fractae: "Alegría", group: "mamiferos" })).status).toBe(400);
    const r = await call(createDraft, db, c, "POST", "/api/admin/drafts", { genus: "Quetzalcoatlus", fractae: "Alegría", group: "pterosaurios" });
    const id = ((await r.json()) as { id: number }).id;
    expect(db.sqlite.prepare("SELECT taxon_group FROM species_drafts WHERE id = ?").get(id).taxon_group).toBe("pterosaurios");
    const list = (await (await call(listDrafts, db, c, "GET", "/api/admin/drafts")).json()) as { drafts: { taxon_group: string }[] };
    expect(list.drafts[0].taxon_group).toBe("pterosaurios");
    await call(generateH, db, c, "POST", `/x`, { confirm: true }, { id: String(id) }, { ANTHROPIC_API_KEY: "k" });
    expect(JSON.parse(bodies[0]).messages[0].content).toContain("AVISO DE GRUPO");
  });

  it("existing and default drafts are dinosaurs and get the unchanged prompt", async () => {
    const db = makeD1();
    const c = loginAs(db, "admin");
    const bodies: string[] = [];
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      if (String(u).includes("api.anthropic.com")) { bodies.push(String(init?.body)); return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(FIELDS) }] })); }
      return new Response("", { status: 404 });
    });
    const id = await newDraft(db, c);
    expect(db.sqlite.prepare("SELECT taxon_group FROM species_drafts WHERE id = ?").get(id).taxon_group).toBe("dinosaurios");
    await call(generateH, db, c, "POST", `/x`, { confirm: true }, { id: String(id) }, { ANTHROPIC_API_KEY: "k" });
    expect(JSON.parse(bodies[0]).messages[0].content).not.toContain("AVISO DE GRUPO");
  });

  it("a structurally invalid edit is rejected and nothing is stored", async () => {
    const db = makeD1();
    const c = loginAs(db, "admin");
    stubFetch({ n: 0 });
    const id = await newDraft(db, c);
    const p = { id: String(id) };
    await call(generateH, db, c, "POST", `/x`, { confirm: true }, p, { ANTHROPIC_API_KEY: "k" });
    const bad = await call(patchDraft, db, c, "PATCH", `/x`, { spec: { scientificName: "nope" } }, p);
    expect(bad.status).toBe(422);
    expect(db.sqlite.prepare("SELECT COUNT(*) n FROM spec_versions").get().n).toBe(1);
  });

  it("a failed provider call stores nothing and keeps the draft usable", async () => {
    const db = makeD1();
    const c = loginAs(db, "admin");
    vi.stubGlobal("fetch", async (u: string) => (String(u).includes("anthropic") ? new Response("boom", { status: 500 }) : new Response("", { status: 404 })));
    const id = await newDraft(db, c);
    const r = await call(generateH, db, c, "POST", `/x`, { confirm: true }, { id: String(id) }, { ANTHROPIC_API_KEY: "k" });
    expect(r.status).toBe(502);
    expect(db.sqlite.prepare("SELECT COUNT(*) n FROM spec_versions").get().n).toBe(0);
  });

  it("cannot jump candidate -> approved, and promoted can't be set", async () => {
    const db = makeD1();
    const c = loginAs(db, "admin");
    const id = await newDraft(db, c);
    const p = { id: String(id) };
    expect((await call(statusH, db, c, "POST", `/x`, { to: "approved" }, p)).status).toBe(409);
    expect((await call(statusH, db, c, "POST", `/x`, { to: "promoted" }, p)).status).toBe(400);
  });
});
