import { describe, it, expect, vi } from "vitest";
import { approvalBlockers, assembleSpec, callAnthropic, canTransition, isEditable, research, sourceUrls } from "./discovery";

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("status workflow", () => {
  it("follows the documented flow", () => {
    expect(canTransition("candidate", "researching")).toBe(true);
    expect(canTransition("spec_draft", "approved")).toBe(true);
    expect(canTransition("needs_revision", "spec_draft")).toBe(true);
    expect(canTransition("needs_revision", "approved")).toBe(true); // shortcut; approval still demands a complete sheet
  });
  it("cannot skip review or approve straight from a candidate", () => {
    expect(canTransition("candidate", "approved")).toBe(false);
    expect(canTransition("researching", "approved")).toBe(false);
  });
  it("'promoted' is never reachable from Discovery", () => {
    for (const s of ["candidate", "researching", "spec_draft", "needs_revision", "approved", "rejected"] as const) {
      expect(canTransition(s, "promoted")).toBe(false);
    }
  });
  it("approved is immutable: only reopening is allowed and editing is blocked", () => {
    expect(isEditable("approved")).toBe(false);
    expect(canTransition("approved", "needs_revision")).toBe(true);
    expect(canTransition("approved", "rejected")).toBe(false);
  });
});

describe("research", () => {
  it("records only the sources that answered, with real refs and a consult date", async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("paleobiodb.org") && u.includes("taxa/single"))
        return okJson({ records: [{ taxon_name: "Stegosaurus", taxon_rank: "genus", n_occs: 12 }] });
      return new Response("nope", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await research("Stegosaurus", fetchFn, new Date("2026-11-22T10:00:00Z"));
    expect(r.sources.map((s) => s.source)).toEqual(["pbdb"]);
    expect(r.sources[0]).toMatchObject({ ref: sourceUrls("Stegosaurus").pbdb, consultedAt: "2026-11-22T10:00:00.000Z" });
    expect(r.realData).toContain("Stegosaurus");
    expect(r.raw.nhm).toBeNull();
  });
  it("returns no sources and no realData when nothing answers (nothing invented)", async () => {
    const fetchFn = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    const r = await research("Nopeosaurus", fetchFn);
    expect(r.sources).toEqual([]);
    expect(r.realData).toBeNull();
  });
});

describe("callAnthropic", () => {
  const prompt = "p";
  it("parses fenced JSON and reports usage", async () => {
    const fetchFn = vi.fn(async () =>
      okJson({ content: [{ type: "text", text: '```json\n{"commonName":"X"}\n```' }], usage: { input_tokens: 5, output_tokens: 7 } })
    ) as unknown as typeof fetch;
    const r = await callAnthropic(prompt, "k", "some-model", fetchFn);
    expect(r.fields).toEqual({ commonName: "X" });
    expect(r.usage).toEqual({ input_tokens: 5, output_tokens: 7 });
    const [, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(JSON.parse(init.body as string).model).toBe("some-model");
  });
  it("does not leak the provider's error body", async () => {
    const fetchFn = (async () => new Response("secret detail", { status: 401 })) as unknown as typeof fetch;
    await expect(callAnthropic(prompt, "k", "m", fetchFn)).rejects.toThrow(/^Anthropic API error: 401$/);
  });
});

describe("assembleSpec / approval", () => {
  const prov = { sources: [{ source: "pbdb" as const, ref: "https://x", consultedAt: "2026-11-22" }] };
  const fields = { scientificName: "Stegosaurus pavor", commonName: "Espina", traits: "t", habitat: "h", palette: "p", silhouette: "s", closestFamousRelative: "Stegosaurus", distinguishingFromRelative: "d", lorePhrase: "l", fractae: { name: "Alegría" } };
  it("takes Fractae, latin name and opposite from canon, ignoring the model's own claims", () => {
    const spec = assembleSpec(fields, "Miedo", "Wave 2", prov);
    expect(spec.fractae).toEqual({ name: "Miedo", latin: "Pavor" });
    expect(spec.oppositeFractae).toBe("Furia (Ira)");
    expect(spec.edition).toBe("Wave 2");
  });
  it("blocks approval until habitatSlug is chosen by a human", () => {
    const spec = assembleSpec(fields, "Miedo", "", prov);
    expect(approvalBlockers(spec)).toEqual(["habitatSlug: Falta; obligatorio en fichas nuevas (World Bible v7 §15.4.4)"]);
    expect(approvalBlockers({ ...spec, habitatSlug: "pantano-oscuro" })).toEqual([]);
  });
  it("blocks approval of a sheet with empty model fields", () => {
    expect(approvalBlockers(assembleSpec({}, "Miedo", "", prov)).length).toBeGreaterThan(3);
  });
});

describe("callAnthropic diagnostics", () => {
  it("explains a response without a text block (stop_reason and block types only)", async () => {
    const fetchFn = (async () => okJson({ content: [{ type: "thinking" }], stop_reason: "max_tokens" })) as unknown as typeof fetch;
    await expect(callAnthropic("p", "k", "m", fetchFn)).rejects.toThrow("sin texto (stop_reason=max_tokens, bloques=thinking)");
  });
});
