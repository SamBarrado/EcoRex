import { describe, it, expect } from "vitest";
import { validateSpec, hasErrors, speciesSlug, HABITAT_SLUGS, type SpecSheet } from "./specContract";
// Data only: the real catalog is the ground truth of the contract. (Tests may
// read it; application code under functions/ must never import from tools/.)
import lote from "../../../tools/species/lote.json";
import wave1 from "../../../tools/species/species.wave1.json";

const valid: SpecSheet = {
  scientificName: "Tyrannosaurus imperator",
  commonName: "Rex de Fuego",
  fractae: { name: "Furia", latin: "Ira" },
  traits: "t",
  palette: "p",
  silhouette: "s",
  habitat: "h",
  closestFamousRelative: "Tyrannosaurus rex",
  distinguishingFromRelative: "d",
  edition: "",
  oppositeFractae: "Miedo (Pavor)",
  lorePhrase: "l",
  habitatSlug: "matorral-arido",
};
const errors = (x: unknown) => validateSpec(x).filter((i) => i.level === "error").map((i) => i.path);

describe("validateSpec", () => {
  it("accepts a complete sheet with no issues", () => {
    expect(validateSpec(valid)).toEqual([]);
  });
  it("rejects non-objects", () => {
    expect(hasErrors(validateSpec(null))).toBe(true);
    expect(hasErrors(validateSpec([]))).toBe(true);
  });
  it("flags missing required text fields", () => {
    expect(errors({ ...valid, traits: " " })).toEqual(["traits"]);
  });
  it("accepts a subspecies and requires at least genus + species", () => {
    expect(errors({ ...valid, scientificName: "Tyrannosaurus rex furibundus" })).toEqual([]);
    expect(errors({ ...valid, scientificName: "Tyrannosaurus" })).toEqual(["scientificName"]);
  });
  it("requires a well-formed scientific name", () => {
    expect(errors({ ...valid, scientificName: "tyrannosaurus Rex" })).toEqual(["scientificName"]);
  });
  it("rejects a Fractae that is not one of the 8 canonical pairs", () => {
    expect(errors({ ...valid, fractae: { name: "Furia", latin: "Pavor" } })).toEqual(["fractae"]);
    expect(errors({ ...valid, fractae: { name: "Ira", latin: "Furia" } })).toEqual(["fractae"]);
  });
  it("rejects a wrong opposite Fractae", () => {
    expect(errors({ ...valid, oppositeFractae: "Alegría (Lumen)" })).toEqual(["oppositeFractae"]);
  });
  it("rejects a habitat slug outside the 12 canonical ones", () => {
    expect(errors({ ...valid, habitatSlug: "playa" })).toEqual(["habitatSlug"]);
    expect(HABITAT_SLUGS).toHaveLength(12);
  });
  it("treats legacy gaps as warnings, not errors", () => {
    const { habitatSlug: _h, lorePhrase: _l, ...legacy } = valid;
    const issues = validateSpec(legacy);
    expect(hasErrors(issues)).toBe(false);
    expect(issues.map((i) => i.path).sort()).toEqual(["habitatSlug", "lorePhrase"]);
  });
  it("won't accept a source without a reference (no invented citations)", () => {
    const bad = { ...valid, provenance: { sources: [{ source: "pbdb", ref: "", consultedAt: "2026-11-22" }] } };
    expect(errors(bad)).toEqual(["provenance.sources[0].ref"]);
  });
});

describe("real catalog (tools/species)", () => {
  it("every sheet in lote.json passes with no errors", () => {
    const bad = (lote as unknown[]).map((s, i) => ({ i, e: errors(s) })).filter((x) => x.e.length);
    expect(bad).toEqual([]);
  });
  it("every sheet in species.wave1.json passes with no errors", () => {
    expect((wave1 as unknown[]).flatMap((s) => errors(s))).toEqual([]);
  });
  it("has no duplicate scientific names", () => {
    const names = (lote as SpecSheet[]).map((s) => s.scientificName);
    expect(new Set(names).size).toBe(names.length);
  });
  it("only the two known legacy sheets lack habitatSlug/lorePhrase (documented drift)", () => {
    const gaps = (lote as SpecSheet[])
      .filter((s) => validateSpec(s).some((i) => i.level === "warning"))
      .map((s) => s.scientificName)
      .sort();
    expect(gaps).toEqual(["Diplodocus fidei", "Stegosaurus pavor"]);
  });
});

describe("speciesSlug", () => {
  it("matches the public/species-art folder convention", () => {
    expect(speciesSlug("Tyrannosaurus imperator")).toBe("tyrannosaurus-imperator");
  });
});
