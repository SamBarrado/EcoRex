import { describe, it, expect, vi } from "vitest";
import { GROUPS, DEFAULT_GROUP, resolveGroup } from "../../../shared/species-sources/groups.mjs";
import { listGenera } from "../../../shared/species-sources/pbdb.mjs";
import { fetchWikipedia, formatForPrompt } from "../../../shared/species-sources/wikipedia.mjs";
import { buildPrompt, resolveFractae } from "../../../shared/species-spec/prompt.mjs";
import { research } from "./discovery";

describe("resolveGroup", () => {
  it("defaults to dinosaurs and knows the chosen groups", () => {
    expect(resolveGroup(undefined)?.key).toBe(DEFAULT_GROUP);
    expect(resolveGroup("pterosaurios")?.baseNames).toEqual(["Pterosauria"]);
    expect(resolveGroup("reptiles-marinos")?.baseNames).toEqual(["Plesiosauria", "Ichthyosauria", "Mosasauridae"]);
    expect(Object.keys(GROUPS)).not.toContain("sinapsidos"); // deliberately left out
  });
  it("rejects unknown keys, including prototype tricks", () => {
    for (const k of ["mamiferos", "constructor", "__proto__", "toString", ""]) expect(resolveGroup(k)).toBeNull();
  });
  it("only dinosaurs are flagged as dinosaurs", () => {
    expect(Object.entries(GROUPS).filter(([, g]) => g.dinosaur).map(([k]) => k)).toEqual(["dinosaurios"]);
  });
});

describe("listGenera", () => {
  it("asks PBDB for all clades of a group at once and caches per group", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ records: [{ taxon_name: "Pteranodon" }, { taxon_name: "Quetzalcoatlus" }] }))) as unknown as typeof fetch;
    const a = await listGenera(["Pterosauria"], f);
    const b = await listGenera(["Pterosauria"], f);
    expect(a).toEqual(["Pteranodon", "Quetzalcoatlus"]);
    expect(b).toBe(a);
    expect(f).toHaveBeenCalledTimes(1);
    await listGenera(["Plesiosauria", "Ichthyosauria", "Mosasauridae"], f);
    const url = decodeURIComponent((f as unknown as { mock: { calls: [string][] } }).mock.calls[1][0]);
    expect(url).toContain("base_name=Plesiosauria,Ichthyosauria,Mosasauridae");
  });
});

describe("Wikipedia source", () => {
  const page = (type: string, extract: string) => new Response(JSON.stringify({ type, extract, title: "T", content_urls: { desktop: { page: "https://w/x" } } }));
  it("returns English and Spanish text and ignores disambiguation / missing pages", async () => {
    const f = (async (u: string) => (String(u).includes("//en.") ? page("standard", "A pterosaur.") : page("disambiguation", "may refer to"))) as unknown as typeof fetch;
    const r = await fetchWikipedia("Pteranodon", f);
    expect(r?.en?.extract).toBe("A pterosaur.");
    expect(r?.es).toBeNull();
    expect(await fetchWikipedia("Nope", (async () => new Response("", { status: 404 })) as unknown as typeof fetch)).toBeNull();
  });
  it("labels itself as less authoritative in prompts", () => {
    expect(formatForPrompt({ genus: "X", en: { lang: "en", title: "X", extract: "e", url: "u" }, es: null })).toContain("less authoritative");
  });
  it("research() records it as a source with its real URL and puts it last in the prompt data", async () => {
    const f = (async (u: string) => {
      const s = String(u);
      if (s.includes("wikipedia.org")) return page("standard", "Un pterosaurio.");
      if (s.includes("paleobiodb.org") && s.includes("taxa/single")) return new Response(JSON.stringify({ records: [{ taxon_name: "Pteranodon", taxon_rank: "genus" }] }));
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await research("Pteranodon", f);
    expect(r.sources.map((s) => s.source)).toEqual(["pbdb", "wikipedia", "wikipedia"]);
    expect(r.sources[1].ref).toBe("https://w/x");
    expect(r.realData!.indexOf("Paleobiology")).toBeLessThan(r.realData!.indexOf("Wikipedia"));
  });
});

describe("buildPrompt group notice", () => {
  const f = resolveFractae("Miedo");
  it("leaves the prompt untouched for dinosaurs and when no group is given", () => {
    const base = buildPrompt("X", f, null);
    expect(buildPrompt("X", f, null, { label: "Dinosaurios", dinosaur: true })).toBe(base);
    expect(base).not.toContain("AVISO DE GRUPO");
  });
  it("tells the model it is NOT a dinosaur and to pick a relative from the same group", () => {
    const p = buildPrompt("X", f, null, { label: "Pterosaurios", dinosaur: false, relatives: ["Pteranodon", "Quetzalcoatlus"] });
    expect(p).toContain("NO es un dinosaurio");
    expect(p).toContain("Pteranodon, Quetzalcoatlus");
    expect(p).toContain("nunca un dinosaurio");
  });
});
