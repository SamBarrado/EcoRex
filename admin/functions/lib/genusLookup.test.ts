import { describe, it, expect, vi } from "vitest";
import { rankGenera, phonetic, levenshtein } from "../../../shared/species-sources/genusSearch.mjs";
import { suggestGenera } from "./genusLookup";

const G = ["Tyrannosaurus", "Triceratops", "Stegosaurus", "Stegoceras", "Diplodocus", "Ankylosaurus", "Parasaurolophus", "Velociraptor", "Titanosaurus", "Allosaurus", "Carnotaurus", "Brachiosaurus", "Ceratosaurus", "Euoplocephalus", "Chasmosaurus"];

describe("phonetic key", () => {
  it("makes Latin and Spanish spellings meet", () => {
    expect(phonetic("Tyrannosaurus")).toBe(phonetic("tiranosaurus"));
    expect(phonetic("Chasmosaurus")).toBe("chasmosaurus");
    expect(phonetic("Parasaurolophus")).toBe(phonetic("parasaurolofus"));
  });
  it("levenshtein gives up past the limit", () => {
    expect(levenshtein("abc", "abd", 1)).toBe(1);
    expect(levenshtein("abc", "xyz", 1)).toBe(2);
  });
});

describe("rankGenera", () => {
  it("prefix first, then anywhere in the name", () => {
    const r = rankGenera(G, "stego");
    expect(r.slice(0, 2).sort()).toEqual(["Stegoceras", "Stegosaurus"]);
    expect(rankGenera(G, "saurus")).toEqual(expect.arrayContaining(["Allosaurus", "Stegosaurus", "Tyrannosaurus"]));
    expect(rankGenera(G, "ceratops")[0]).toBe("Triceratops");
  });
  it("ignores case, accents, spaces and hyphens", () => {
    expect(rankGenera(G, "  ÁNKYLO-sau ")[0]).toBe("Ankylosaurus");
  });
  it("accepts Spanish spellings", () => {
    expect(rankGenera(G, "tiranosaurio")[0]).toBe("Tyrannosaurus");
    expect(rankGenera(G, "estegosaurio")[0]).toBe("Stegosaurus");
    expect(rankGenera(G, "diplodoco")[0]).toBe("Diplodocus");
    expect(rankGenera([...G, "Unquillosaurus"], "anquilosaurio")).toEqual(["Ankylosaurus"]);
  });
  it("tolerates typos", () => {
    expect(rankGenera(G, "triceratop")[0]).toBe("Triceratops");
    expect(rankGenera(G, "velocirraptor")[0]).toBe("Velociraptor");
    expect(rankGenera(G, "carnotorus")[0]).toBe("Carnotaurus");
  });
  it("uses only the first word of 'Genus species'", () => {
    expect(rankGenera(G, "Tyrannosaurus rex")[0]).toBe("Tyrannosaurus");
  });
  it("drops typo-neighbours when there is already an exact or prefix match", () => {
    expect(rankGenera(G, "Tyrannosaurus rex")).toEqual(["Tyrannosaurus"]);
  });
  it("lists a genus once even if PBDB repeats it", () => {
    expect(rankGenera(["Titanosaurus", "Titanosaurus", "Allosaurus"], "titano")).toEqual(["Titanosaurus"]);
  });
  it("doesn't return unrelated names for gibberish or one letter", () => {
    expect(rankGenera(G, "qzxwv")).toEqual([]);
    expect(rankGenera(G, "")).toEqual([]);
  });
  it("respects the limit", () => {
    expect(rankGenera(G, "saurus", 3)).toHaveLength(3);
  });
});

describe("suggestGenera", () => {
  const wiki = (titles: string[]) => vi.fn(async () => new Response(JSON.stringify(["q", titles]))) as unknown as typeof fetch;
  it("answers locally without touching the network when it can", async () => {
    const f = wiki([]);
    expect(await suggestGenera("tiranosaurio", G, { fetchFn: f })).toEqual({ genera: ["Tyrannosaurus"], via: "local" });
    expect(f).not.toHaveBeenCalled();
  });
  it("falls back to Spanish Wikipedia and keeps only real dinosaur genera", async () => {
    const f = wiki(["Titanosaurus", "Tirano (novela)", "Tyrannosauridae", "Stegosaurus rex"]);
    const r = await suggestGenera("lagarto gigante", G, { fetchFn: f });
    expect(r).toEqual({ genera: ["Titanosaurus", "Stegosaurus"], via: "wikipedia-es" });
    const init = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1];
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^EcorexAdmin/);
  });
  it("treats a short first word in a multi-word text as a common name (no bird matches)", async () => {
    const f = wiki(["Pico de Santo Tomé"]);
    const r = await suggestGenera("pico de pato", [...G, "Picus", "Picoides"], { fetchFn: f });
    expect(r).toEqual({ genera: [], via: "none" });
    expect(f).toHaveBeenCalled();
  });
  it("still treats 'Genus species' as a scientific name", async () => {
    const f = wiki([]);
    expect((await suggestGenera("Stegosaurus stenops", G, { fetchFn: f })).genera).toEqual(["Stegosaurus"]);
    expect(f).not.toHaveBeenCalled();
  });
  it("doesn't call Wikipedia for very short input, and survives its failure", async () => {
    const f = wiki(["Stegosaurus"]);
    expect((await suggestGenera("zz", G, { fetchFn: f })).via).toBe("none");
    expect(f).not.toHaveBeenCalled();
    const boom = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
    expect(await suggestGenera("lagarto gigante", G, { fetchFn: boom })).toEqual({ genera: [], via: "none" });
  });
});
