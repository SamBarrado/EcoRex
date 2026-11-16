import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { EcodexTile } from "./EcodexTile";
import type { DexSlotRevealed } from "../../lib/api";

const slot: DexSlotRevealed = {
  species_id: 2,
  phase: "balance",
  wave: 1,
  locked: false,
  scientific_name: "Huayangosaurus taibaii",
  common_name: "Hustor de Umbra",
  fractae_child_name: "Curiosidad",
  rarity_name: "Especie Común",
  rarity_slug: "comun",
  image_url: "/species-art/huayangosaurus/balance.webp",
  discovery_code: "DX-AAA",
  discovered_at: "2026-07-05T10:00:00Z",
  lore_phrase: null,
  count: 1,
};

afterEach(cleanup);

describe("EcodexTile reveal stack", () => {
  it("does not hard-code width/height on the reveal images (they override the grid aspect-ratio and make the art overflow the tile)", () => {
    const { container } = render(
      <EcodexTile
        slot={slot}
        isJustUnlocked
        revealPending={false}
        shaking={false}
        onOpen={vi.fn()}
        onLockedClick={vi.fn()}
      />
    );
    const imgs = container.querySelectorAll(".slot-reveal-stack img");
    expect(imgs.length).toBe(2);
    imgs.forEach((img) => {
      expect(img.hasAttribute("width")).toBe(false);
      expect(img.hasAttribute("height")).toBe(false);
    });
  });
});
