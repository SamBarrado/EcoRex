import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EcodexTile } from "./EcodexTile";
import type { DexSlotLocked, DexSlotRevealed } from "../../lib/api";

const slot: DexSlotRevealed = {
  species_id: 2,
  phase: "balance",
  wave: 1,
  locked: false,
  scientific_name: "Huayangosaurus taibaii",
  common_name: "Hustor de Umbra",
  fractae_child_name: "Curiosidad",
  rarity_name: "Especie Rara",
  rarity_slug: "singular",
  image_url: "/species-art/huayangosaurus/balance.webp",
  discovery_code: "DX-AAA",
  discovered_at: "2026-07-05T10:00:00Z",
  lore_phrase: "Una frase de lore.",
  count: 1,
};

const lockedSlot: DexSlotLocked = { species_id: 3, phase: "balance", wave: 1, locked: true };

afterEach(cleanup);

function renderTile(overrides: Partial<React.ComponentProps<typeof EcodexTile>> = {}) {
  const props = {
    slot,
    isJustUnlocked: false,
    revealPending: false,
    shaking: false,
    onOpen: vi.fn(),
    onLockedClick: vi.fn(),
    ...overrides,
  };
  return { ...render(<EcodexTile {...props} />), props };
}

describe("EcodexTile", () => {
  it("shows name, short rarity name and Fractae medal on a revealed tile", () => {
    renderTile();

    expect(screen.getByText("Hustor de Umbra")).toBeInTheDocument();
    expect(screen.getByText("Rara")).toBeInTheDocument();
    expect(screen.getByAltText("Fractae: Curiosidad")).toHaveAttribute("src", "/icons/fractae/curiosidad.png");
  });

  it("derives the frame tier from the rarity slug", () => {
    const { container } = renderTile();

    expect(container.querySelector(".ecodex-tile")).toHaveClass("tile-r2");
    expect(container.querySelectorAll(".ecodex-tile-pips i.on")).toHaveLength(3);
  });

  it("shows a duplicate counter only for 2 or more copies", () => {
    const { rerender, props } = renderTile();
    expect(screen.queryByText("×1")).not.toBeInTheDocument();

    rerender(<EcodexTile {...props} slot={{ ...slot, count: 3 }} />);
    expect(screen.getByText("×3")).toBeInTheDocument();
  });

  it("does not show the lore phrase under the tile (it lives on the card itself)", () => {
    renderTile();

    expect(screen.queryByText(/Una frase de lore/)).not.toBeInTheDocument();
  });

  it("renders a locked slot as the locked card, and shakes via onLockedClick", () => {
    const { props } = renderTile({ slot: lockedSlot });

    fireEvent.click(screen.getByAltText("Carta bloqueada"));

    expect(props.onLockedClick).toHaveBeenCalledTimes(1);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("opens the card on click for a revealed tile", () => {
    const { props } = renderTile();

    fireEvent.click(screen.getByText("Hustor de Umbra"));

    expect(props.onOpen).toHaveBeenCalledWith(slot);
  });

  it("keeps showing the locked card while a just-unlocked reveal is pending", () => {
    const { container } = renderTile({ isJustUnlocked: true, revealPending: true });

    expect(screen.getByAltText("Carta bloqueada")).toBeInTheDocument();
    expect(screen.queryByText("Hustor de Umbra")).not.toBeInTheDocument();
    expect(container.querySelector(".slot-just-unlocked")).toBeNull();
  });

  it("plays the unlock animation once the pending delay is over", () => {
    const { container } = renderTile({ isJustUnlocked: true, revealPending: false });

    expect(screen.getByText("Hustor de Umbra")).toBeInTheDocument();
    expect(container.querySelector(".slot-just-unlocked")).not.toBeNull();
  });
});
