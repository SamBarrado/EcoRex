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
  lore_phrase: "Ruge donde arde el horizonte.",
  count: 1,
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
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
    const lockedTile = await screen.findByAltText("Carta bloqueada");
    fireEvent.click(lockedTile.closest(".ecodex-slot")!);
    await waitFor(() => {
      expect(screen.queryByTestId("card-perspective")).not.toBeInTheDocument();
    });
  });

  it("does not show the lore phrase on the grid tile, only once the card is opened", async () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>
    );
    const tile = await screen.findByText("Rex de Fuego");
    expect(screen.queryByText(/Ruge donde arde el horizonte/)).not.toBeInTheDocument();

    fireEvent.click(tile.closest(".ecodex-slot")!);
    expect(await screen.findByText(/Ruge donde arde el horizonte/)).toBeInTheDocument();
  });

  it("opens a full-screen card viewer when a revealed slot is clicked", async () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>
    );
    const revealedTile = await screen.findByText("Rex de Fuego");
    fireEvent.click(revealedTile.closest(".ecodex-slot")!);
    await waitFor(() => {
      expect(screen.getAllByText("Rex de Fuego").length).toBeGreaterThan(1);
    });
    expect(screen.queryByText("Código:", { exact: false })).not.toBeInTheDocument();
  });
});

describe("ColeccionPage behavior", () => {
  const excesoSlot = {
    ...revealedSlot,
    species_id: 3,
    phase: "exceso",
    common_name: "Tricera Umbra",
    count: 3,
  };

  function mockSlots(slots: unknown[]) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ currentWave: 1, slots }),
    } as Response);
  }

  function renderPage() {
    return render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>
    );
  }

  it("filters the grid by phase and goes back to all", async () => {
    mockSlots([revealedSlot, excesoSlot]);
    renderPage();
    expect(await screen.findByText("Rex de Fuego")).toBeInTheDocument();
    expect(screen.getByText("Tricera Umbra")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "exceso" }));
    expect(screen.queryByText("Rex de Fuego")).not.toBeInTheDocument();
    expect(screen.getByText("Tricera Umbra")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("Rex de Fuego")).toBeInTheDocument();
    expect(screen.getByText("Tricera Umbra")).toBeInTheDocument();
  });

  it("shows the duplicate count badge only when there is more than one copy", async () => {
    mockSlots([revealedSlot, excesoSlot]);
    renderPage();
    await screen.findByText("Rex de Fuego");
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.queryByText("×1")).not.toBeInTheDocument();
  });

  it("shakes a locked tile when it is clicked", async () => {
    mockSlots([lockedSlot]);
    renderPage();
    const lockedTile = (await screen.findByAltText("Carta bloqueada")).closest(".ecodex-slot")!;
    expect(lockedTile.className).not.toContain("slot-locked-shake");
    fireEvent.click(lockedTile);
    expect(lockedTile.className).toContain("slot-locked-shake");
  });

  it("locks body scroll while the card viewer is open and restores it on close", async () => {
    mockSlots([revealedSlot]);
    renderPage();
    fireEvent.click((await screen.findByText("Rex de Fuego")).closest(".ecodex-slot")!);
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByTestId("card-perspective")).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("counts only playable slots in the 'Registros' progress, so the '???' placeholders don't cap it below 100%", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        currentWave: 1,
        slots: [
          { ...revealedSlot, species_id: 1, playable: true },
          { species_id: 1, phase: "exceso", wave: 1, locked: true as const, playable: true },
          { species_id: 9, phase: "balance", wave: 1, locked: true as const, playable: false },
          { species_id: 9, phase: "exceso", wave: 1, locked: true as const, playable: false },
        ],
      }),
    } as Response);

    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Registros")).toBeInTheDocument();
    // 1 registered out of 2 playable (not out of 4 slots).
    expect(screen.getByText("1/2 (50%)")).toBeInTheDocument();
    expect(screen.queryByText(/Especies registradas/)).not.toBeInTheDocument();
  });
});
