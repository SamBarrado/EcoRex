import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ColeccionPage from "./ColeccionPage";

const lockedSlot = { species_id: 1, phase: "balance", wave: 1, locked: true as const, count: 0 };
const revealedSlot = {
  species_id: 2,
  phase: "balance",
  wave: 1,
  locked: false as const,
  scientific_name: "Tyrannosaurus imperator",
  common_name: "Rex de Fuego",
  fractae_child_name: "Furia",
  rarity_name: "Especie Epica",
  rarity_slug: "epica",
  image_url: "/species-art/rex/balance.png",
  discovery_code: "DX-AAA",
  discovered_at: "2026-07-05T10:00:00Z",
  count: 1,
};

beforeEach(() => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ currentWave: 1, slots: [lockedSlot, revealedSlot] }),
  } as Response);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ColeccionPage", () => {
  it("does not open the preview when a locked slot is clicked", async () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>
    );
    const lockedTile = await screen.findByText("???");
    fireEvent.click(lockedTile.closest(".card")!);
    await waitFor(() => {
      expect(screen.queryByText("Carta aún no descubierta. Juega en Percibir para desbloquearla.")).not.toBeInTheDocument();
    });
  });

  it("opens the preview when a revealed slot is clicked", async () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>
    );
    const revealedTile = await screen.findByText("Rex de Fuego");
    fireEvent.click(revealedTile.closest(".card")!);
    await waitFor(() => {
      expect(screen.getByText("Tyrannosaurus imperator")).toBeInTheDocument();
    });
  });
});
