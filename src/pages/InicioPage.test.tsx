import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
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
  registeredCount: 4,
  registeredTotalCount: 30,
  repeatedCount: 2,
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
  localStorage.clear();
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

  it("shows species and EcoDex registries as two separate, clearly labelled progress lines", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2");

    expect(screen.getByText("Especies descubiertas")).toBeTruthy();
    expect(screen.getByText("3/10 (30%)")).toBeTruthy();
    expect(screen.getByText("Registros del EcoDex")).toBeTruthy();
    expect(screen.getByText("4/30 (13%)")).toBeTruthy();
  });

  it("labels the unbuilt features as coming soon instead of showing dead locks", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2");

    // Eco is no longer a "mode": it's a rare drop of Percibir, so it has no tile.
    // Álbum y Amigos están ocultos (SHOW_COMING_SOON_TILES = false).
    expect(screen.queryByText("Próximamente")).toBeNull();
    expect(screen.queryByLabelText("Eco, próximamente")).toBeNull();
    expect(screen.queryByLabelText("Álbum, próximamente")).toBeNull();
    expect(screen.queryByLabelText("Amigos, próximamente")).toBeNull();
    // The Fusion Altar keeps its lock: it's unlockable, unlike the others.
    expect(screen.getByText(/Altar de Fusión/).textContent).toContain("🔒");
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

    const initialMatch = screen.getByText(/\+1 en \d+m/).textContent;
    const initialMinutes = Number(initialMatch?.match(/(\d+)m/)?.[1]);

    await act(async () => {
      vi.advanceTimersByTime(2 * 60000);
      await vi.runOnlyPendingTimersAsync();
    });

    const laterMatch = screen.getByText(/\+1 en \d+m/).textContent;
    const laterMinutes = Number(laterMatch?.match(/(\d+)m/)?.[1]);

    expect(laterMinutes).toBeLessThanOrEqual(initialMinutes - 2);
  });

  it("shows the welcome intro to a brand-new account (no cards yet), with no skip, and not again after it", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue({ ...profile, totalDiscoveries: 0, repeatedCount: 0 });
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <Routes>
          <Route path="/inicio" element={<InicioPage />} />
          <Route path="/percibir" element={<div>Pantalla de percibir</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Hace 66 millones de años…")).toBeTruthy();
    expect(screen.queryByText(/saltar/i)).toBeNull();

    // No skip: the only way through is "Siguiente" ×2 and then the final button.
    fireEvent.click(screen.getByText("Siguiente"));
    fireEvent.click(screen.getByText("Siguiente"));
    expect(localStorage.getItem("ecorex_welcome_seen_1")).toBeNull();
    fireEvent.click(screen.getByText("Percibir mi primera carta"));

    expect(await screen.findByText("Pantalla de percibir")).toBeTruthy();
    expect(localStorage.getItem("ecorex_welcome_seen_1")).toBe("1");

    cleanup();
    renderPage();
    await screen.findByText("Nivel 2");
    expect(screen.queryByText("Hace 66 millones de años…")).toBeNull();
  });

  it("never shows the intro to an existing player, and records that", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile); // totalDiscoveries: 5
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2");
    expect(screen.queryByText("Hace 66 millones de años…")).toBeNull();
    expect(localStorage.getItem("ecorex_welcome_seen_1")).toBe("1");
  });

  it("shows the streak and the closest fusion progress", async () => {
    getFuseEligibleMock.mockResolvedValue({
      threshold: 5,
      eligible: [],
      progress: [
        { speciesId: 7, commonName: "Rex de Fuego", scientificName: "T. imperator", balanceAnchorUrl: "/x.webp", balanceCount: 3 },
      ],
    });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue({
      day: "2026-11-18",
      missions: [],
      bonus: { completed: false, xp: 30 },
      streak: { days: 2, activeToday: false, nextMilestone: 3, nextMilestoneXp: 20 },
    } satisfies MissionsState);

    renderPage();
    expect(await screen.findByText("🔥 Racha: 2 días seguidos")).toBeTruthy();
    expect(screen.getByText("¡Juega hoy para no perderla!")).toBeTruthy();
    expect(screen.getByText(/Próxima fusión:/).textContent).toContain("Rex de Fuego");
    expect(screen.getByText("3/5")).toBeTruthy();
  });
});
