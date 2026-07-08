import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InicioPage from "./InicioPage";
import type { ProfileStats, EnergyState, MissionsState } from "../lib/api";

const getFuseEligibleMock = vi.fn();
const getMyProfileMock = vi.fn();
const getEnergyMock = vi.fn();
const getMissionsMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getFuseEligible: (...args: unknown[]) => getFuseEligibleMock(...args),
    getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
    getEnergy: (...args: unknown[]) => getEnergyMock(...args),
    getMissions: (...args: unknown[]) => getMissionsMock(...args),
  };
});

const profile: ProfileStats = {
  user: { id: 1, email: "a@a.com", display_name: "A" },
  xp: 50,
  level: 2,
  xpIntoLevel: 10,
  xpForNextLevel: 40,
  title: "Explorador",
  speciesDiscoveredCount: 3,
  speciesTotalCount: 10,
  totalDiscoveries: 5,
  duplicateCount: 2,
  rarityBreakdown: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <InicioPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("InicioPage", () => {
  it("renders separate progress bars for level xp and species discovered", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();

    await screen.findByText("Nivel 2");
    const levelFill = document.querySelector(".level-progress-fill") as HTMLElement;
    const speciesFill = document.querySelector(".species-progress-fill") as HTMLElement;

    expect(levelFill).toBeTruthy();
    expect(speciesFill).toBeTruthy();
    expect(levelFill).not.toBe(speciesFill);
    expect(levelFill.style.width).toBe("25%"); // 10/40
    expect(speciesFill.style.width).toBe("30%"); // 3/10
  });

  it("refreshes the energy countdown as time passes without a page reload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const resetAt = Date.now() + 5 * 60000; // 5 minutes from now
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue({ remaining: 0, max: 2, resetAt, unlimited: false } as EnergyState);
    getMissionsMock.mockResolvedValue(null);

    renderPage();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const initialMatch = screen.getByText(/próxima en \d+m/).textContent;
    const initialMinutes = Number(initialMatch?.match(/(\d+)m/)?.[1]);

    await act(async () => {
      vi.advanceTimersByTime(2 * 60000);
      await vi.runOnlyPendingTimersAsync();
    });

    const laterMatch = screen.getByText(/próxima en \d+m/).textContent;
    const laterMinutes = Number(laterMatch?.match(/(\d+)m/)?.[1]);

    expect(laterMinutes).toBeLessThanOrEqual(initialMinutes - 2);
  });
});
