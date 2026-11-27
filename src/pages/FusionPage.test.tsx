import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FusionPage from "./FusionPage";
import type { EligibleSpecies, DiscoverResult } from "../lib/api";
import { NavVisibilityProvider } from "../lib/NavVisibilityContext";
import { NotificationsProvider } from "../lib/NotificationsContext";

const getFuseEligibleMock = vi.fn();
const fuseSpeciesMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getFuseEligible: (...args: unknown[]) => getFuseEligibleMock(...args),
    fuseSpecies: (...args: unknown[]) => fuseSpeciesMock(...args),
  };
});

const eligibleSpecies: EligibleSpecies = {
  speciesId: 1,
  commonName: "Test Dino",
  scientificName: "Testus dinus",
  balanceAnchorUrl: "/img.png",
  balanceCount: 5,
};

const fuseResult: DiscoverResult = {
  discoveryId: 1,
  discoveryCode: "ABC123",
  speciesId: 1,
  scientificName: "Testus dinus",
  commonName: "Test Dino",
  phase: "exceso",
  rarityTier: { slug: "registrada", name: "Registrada" },
  imageUrl: "/img.png",
  lorePhrase: "A test dino's tale.",
  isNewSlot: true,
  discoveredAt: "2026-01-01",
  xp: { xpGained: 15, totalXp: 100, previousLevel: 1, level: 2, leveledUp: true },
  missionsCompleted: [],
  dailyBonusAwarded: false,
};

beforeEach(() => {
  // jsdom doesn't implement HTMLMediaElement.play()/pause() (returns
  // undefined instead of a Promise); FusionPage's primeSound/playSound call
  // .play().then(...) directly (unlike PercibirRitual's safePlay wrapper),
  // so unmocked this throws. Unrelated to the fix under test.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  cleanup();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <NavVisibilityProvider>
        <NotificationsProvider>
          <FusionPage />
        </NotificationsProvider>
      </NavVisibilityProvider>
    </MemoryRouter>
  );
}

describe("FusionPage", () => {
  it("defers the level-up screen until the fusion result is dismissed", async () => {
    vi.useFakeTimers();
    getFuseEligibleMock.mockResolvedValue({ eligible: [eligibleSpecies] });
    fuseSpeciesMock.mockResolvedValue(fuseResult);

    renderPage();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole("button", { name: /fusionar/i }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Fusion result is shown, but the level-up screen must not appear yet —
    // it would otherwise mount on top of the result at the same instant.
    expect(screen.getByText("¡Fusión completada!")).toBeInTheDocument();
    expect(screen.queryByText("Código:", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText(/subiste de nivel/i)).not.toBeInTheDocument();

    // First click on "Volver al altar" surfaces the level-up screen instead
    // of resetting straight away.
    fireEvent.click(screen.getByRole("button", { name: /volver al altar/i }));

    expect(screen.getByText(/subiste de nivel/i)).toBeInTheDocument();
    expect(screen.getByText("¡Fusión completada!")).toBeInTheDocument();

    // Dismissing it is what finally resets the altar.
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    fireEvent.click(screen.getByText(/subiste de nivel/i));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByText("¡Fusión completada!")).not.toBeInTheDocument();
    expect(screen.queryByText(/subiste de nivel/i)).not.toBeInTheDocument();
    expect(getFuseEligibleMock).toHaveBeenCalledTimes(2);
  });

  it("resets immediately when the fusion does not level up", async () => {
    vi.useFakeTimers();
    getFuseEligibleMock.mockResolvedValue({ eligible: [eligibleSpecies] });
    fuseSpeciesMock.mockResolvedValue({
      ...fuseResult,
      xp: { xpGained: 15, totalXp: 15, previousLevel: 1, level: 1, leveledUp: false },
    });

    renderPage();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole("button", { name: /fusionar/i }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("¡Fusión completada!")).toBeInTheDocument();

    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    fireEvent.click(screen.getByRole("button", { name: /volver al altar/i }));

    expect(screen.queryByText(/subiste de nivel/i)).not.toBeInTheDocument();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByText("¡Fusión completada!")).not.toBeInTheDocument();
  });

  it("lists progress toward the next fusions instead of a dead end", async () => {
    getFuseEligibleMock.mockResolvedValue({
      threshold: 5,
      eligible: [],
      progress: [
        { ...eligibleSpecies, speciesId: 8, commonName: "Tricera", balanceCount: 4 },
        { ...eligibleSpecies, speciesId: 9, commonName: "Ceratosaurio", balanceCount: 1 },
      ],
    });

    renderPage();

    expect(await screen.findByText(/Aún no tienes 5 cartas Balance de la misma especie/)).toBeInTheDocument();
    expect(screen.getByText("Tricera")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("Ceratosaurio")).toBeInTheDocument();
    expect(screen.getByText("1/5")).toBeInTheDocument();
  });

  it("lists what is ready and what is in progress as compact rows, with the hint only once", async () => {
    getFuseEligibleMock.mockResolvedValue({
      threshold: 5,
      eligible: [eligibleSpecies],
      progress: [{ ...eligibleSpecies, speciesId: 8, commonName: "Tricera", balanceCount: 3 }],
    });

    renderPage();

    expect(await screen.findByText("Listas para fusionar")).toBeInTheDocument();
    expect(screen.getByText("En progreso")).toBeInTheDocument();
    expect(screen.getByText("5 cartas Balance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fusionar" })).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getAllByText(/Junta 5 cartas Balance de una especie/)).toHaveLength(1);
  });

  it("shows the fusion as five Balance cards merging into the new card, with what it was worth", async () => {
    vi.useFakeTimers();
    getFuseEligibleMock.mockResolvedValue({ eligible: [{ ...eligibleSpecies, balanceAnchorUrl: "/balance.png" }], threshold: 5 });
    fuseSpeciesMock.mockResolvedValue({
      ...fuseResult,
      imageUrl: "/exceso.png",
      rarityTier: { slug: "registrada", name: "Especie Común" },
      xp: { xpGained: 15, totalXp: 15, previousLevel: 1, level: 1, leveledUp: false },
    });

    renderPage();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByRole("button", { name: /fusionar/i }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("¡Fusión completada!")).toBeInTheDocument();
    const merging = screen.getByRole("img", { name: "5 cartas Balance" });
    const cards = Array.from(merging.querySelectorAll("img"));
    expect(cards).toHaveLength(5);
    expect(cards.every((c) => c.getAttribute("src") === "/balance.png")).toBe(true);
    expect(screen.getByAltText("Test Dino")).toHaveAttribute("src", "/exceso.png");
    expect(screen.getByText("5 cartas Balance → 1 carta Exceso")).toBeInTheDocument();
    expect(screen.getByText("Común")).toBeInTheDocument();
    // The XP is announced once, by the pill and the orbs at the top (not repeated in the card).
    expect(screen.getAllByText("+15 XP")).toHaveLength(1);
  });

  it("shows the energy granted by a level-up reached through a fusion", async () => {
    vi.useFakeTimers();
    getFuseEligibleMock.mockResolvedValue({ eligible: [eligibleSpecies], threshold: 5 });
    fuseSpeciesMock.mockResolvedValue({ ...fuseResult, energyGained: { levelUp: 1, streak: 0 } });

    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Fusionar" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    fireEvent.click(screen.getByRole("button", { name: "Volver al altar" }));

    expect(screen.getByText("⚡ +1 de energía")).toBeInTheDocument();
  });
});
