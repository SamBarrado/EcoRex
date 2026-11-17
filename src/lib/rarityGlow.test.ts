import { describe, it, expect } from "vitest";
import { RARITY_GLOW, rarityTierIndex, shortRarityName, fractaeIconUrlFromName } from "./rarityGlow";

describe("RARITY_GLOW", () => {
  it("has a color for every known rarity slug", () => {
    expect(RARITY_GLOW.registrada).toBe("#bfe6c9");
    expect(RARITY_GLOW.notable).toBe("#4fa9e0");
    expect(RARITY_GLOW.singular).toBe("#a35fe0");
    expect(RARITY_GLOW.epica).toBe("#e0a02f");
    expect(RARITY_GLOW.primordial).toBe("#ffd54a");
  });
});

describe("rarityTierIndex", () => {
  it("orders the slugs from weakest (0) to strongest (4)", () => {
    expect(["registrada", "notable", "singular", "epica", "primordial"].map(rarityTierIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it("falls back to the weakest tier for an unknown slug", () => {
    expect(rarityTierIndex("comun")).toBe(0);
  });
});

describe("shortRarityName", () => {
  it("drops the 'Especie ' prefix", () => {
    expect(shortRarityName("Especie Legendaria")).toBe("Legendaria");
    expect(shortRarityName("Especie Poco Común")).toBe("Poco Común");
  });

  it("leaves names without the prefix alone", () => {
    expect(shortRarityName("Registrada")).toBe("Registrada");
  });
});

describe("fractaeIconUrlFromName", () => {
  it("builds the icon path from the child name, lower-cased and without accents", () => {
    expect(fractaeIconUrlFromName("Furia")).toBe("/icons/fractae/furia.png");
    expect(fractaeIconUrlFromName("Alegría")).toBe("/icons/fractae/alegria.png");
  });

  it("returns undefined when there is no name", () => {
    expect(fractaeIconUrlFromName(undefined)).toBeUndefined();
  });
});
