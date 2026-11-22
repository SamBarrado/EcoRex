import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet } from "./search";
import { makeD1 } from "../../../lib/testD1";

afterEach(() => vi.unstubAllGlobals());
const call = (qs: string, db = makeD1()) =>
  onRequestGet({ request: new Request(`https://a.test/api/admin/discovery/search?${qs}`), env: { DB: db }, data: { admin: { role: "content_editor", user: { id: 1 } } } } as never) as Promise<Response>;

const pbdbStub = (calls: string[]) =>
  vi.stubGlobal("fetch", async (u: string) => {
    const s = decodeURIComponent(String(u));
    calls.push(s);
    if (s.includes("taxa/list")) return new Response(JSON.stringify({ records: [{ taxon_name: "Quetzalcoatlus" }, { taxon_name: "Pterodactylus" }] }));
    return new Response(JSON.stringify({ records: [{ genus: "Quetzalcoatlus", family: "Azhdarchidae", max_ma: 70, min_ma: 66, cc: "US" }] }));
  });

describe("GET discovery/search with groups", () => {
  it("rejects an unknown group", async () => {
    expect((await call("q=ste&group=mamiferos")).status).toBe(400);
  });
  it("finds pterosaurs by name when the group is pterosaurios (and the list comes from PBDB's Pterosauria)", async () => {
    const calls: string[] = [];
    pbdbStub(calls);
    const body = (await (await call("q=quetzal&group=pterosaurios")).json()) as { genera: string[] };
    expect(body.genera).toEqual(["Quetzalcoatlus"]);
    expect(calls.some((c) => c.includes("base_name=Pterosauria"))).toBe(true);
  });
  it("candidate search uses the group's own clades, ignoring a dinosaur clade filter", async () => {
    const calls: string[] = [];
    pbdbStub(calls);
    await call("group=reptiles-marinos&baseName=Theropoda&min=1");
    expect(calls.find((c) => c.includes("occs/list"))).toContain("base_name=Plesiosauria,Ichthyosauria,Mosasauridae");
  });
  it("keeps the clade filter for dinosaurs", async () => {
    const calls: string[] = [];
    pbdbStub(calls);
    await call("group=dinosaurios&baseName=Theropoda&min=1");
    expect(calls.find((c) => c.includes("occs/list"))).toContain("base_name=Theropoda");
  });
});
