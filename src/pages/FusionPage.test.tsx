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
  isUniqueVariant: false,
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
});
