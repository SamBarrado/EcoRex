import { describe, it, expect } from "vitest";
import { RARITY_GLOW } from "./rarityGlow";

describe("RARITY_GLOW", () => {
  it("has a color for every known rarity slug", () => {
    expect(RARITY_GLOW.registrada).toBe("#bfe6c9");
    expect(RARITY_GLOW.notable).toBe("#4fa9e0");
    expect(RARITY_GLOW.singular).toBe("#a35fe0");
    expect(RARITY_GLOW.epica).toBe("#e0a02f");
    expect(RARITY_GLOW.primordial).toBe("#ffd54a");
  });
});
