import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import InicioPage from "./InicioPage";
import type { ProfileStats, EnergyState, MissionsState, OnboardingState } from "../lib/api";
import { NotificationsProvider } from "../lib/NotificationsContext";
import { AchievementsProvider } from "../lib/AchievementsContext";
import { OnboardingProvider } from "../lib/OnboardingContext";

const getFuseEligibleMock = vi.fn();
const getMyProfileMock = vi.fn();
const getEnergyMock = vi.fn();
const getMissionsMock = vi.fn();
const getOnboardingMock = vi.fn();
const claimOnboardingMock = vi.fn();
const getNotificationsMock = vi.fn();
const subscribeMock = vi.fn();

vi.mock("../lib/push", () => ({
  isPushSupported: () => true,
  getNotificationPermission: () => "granted",
  subscribeToPush: (...args: unknown[]) => subscribeMock(...args),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getFuseEligible: (...args: unknown[]) => getFuseEligibleMock(...args),
    getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
    getEnergy: (...args: unknown[]) => getEnergyMock(...args),
    getMissions: (...args: unknown[]) => getMissionsMock(...args),
    getOnboarding: (...args: unknown[]) => getOnboardingMock(...args),
    claimOnboarding: (...args: unknown[]) => claimOnboardingMock(...args),
    getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
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
      <NotificationsProvider>
        <AchievementsProvider>
          <OnboardingProvider>
            <InicioPage />
          </OnboardingProvider>
        </AchievementsProvider>
      </NotificationsProvider>
    </MemoryRouter>
  );
}

const veteran: OnboardingState = {
  eligible: false,
  rewardClaimed: false,
  steps: ["account", "pack", "ecodex", "push", "mission"].map((slug) => ({ slug, done: false })) as OnboardingState["steps"],
};

const newcomer = (done: string[]): OnboardingState => ({
  eligible: true,
  rewardClaimed: false,
  steps: (["account", "pack", "ecodex", "push", "mission"] as const).map((slug) => ({ slug, done: done.includes(slug) })),
});

beforeEach(() => {
  getOnboardingMock.mockResolvedValue(veteran);
  getNotificationsMock.mockResolvedValue({ notifications: [] });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("InicioPage", () => {
  it("shows the level bar in the hero", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();

    await screen.findByText("Nivel 2 · Explorador");
    const levelFill = document.querySelector(".level-progress-fill") as HTMLElement;

    expect(levelFill).toBeTruthy();
    expect(levelFill.style.width).toBe("25%"); // 10/40
    expect(screen.getByText("10/40 XP")).toBeTruthy();
    expect(document.querySelector(".home-hero-text b")?.textContent).toBe("A"); // display name
  });

  it("shows species and EcoDex registries as two separate, clearly labelled chips", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2 · Explorador");

    expect(screen.getByRole("group", { name: "Especies descubiertas 3 de 10" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Registros del EcoDex 4 de 30" })).toBeTruthy();
  });

  it("labels the unbuilt features as coming soon instead of showing dead locks", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2 · Explorador");

    // Eco is no longer a "mode": it's a rare drop of Percibir, so it has no tile.
    // Álbum y Amigos están ocultos (SHOW_COMING_SOON_TILES = false).
    expect(screen.queryByText("Próximamente")).toBeNull();
    expect(screen.queryByLabelText("Eco, próximamente")).toBeNull();
    expect(screen.queryByLabelText("Álbum, próximamente")).toBeNull();
    expect(screen.queryByLabelText("Amigos, próximamente")).toBeNull();
    // The Fusion Altar is always there, never as a dead lock: with nothing gathered it says how to start.
    expect(screen.getByText("Altar de Fusión")).toBeTruthy();
    expect(screen.getByText("Junta 5 cartas Balance de una especie para fusionarlas")).toBeTruthy();
    expect(screen.queryByText(/🔒/)).toBeNull();
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

    const initialMatch = screen.getByText(/de energía en \d+m/).textContent;
    const initialMinutes = Number(initialMatch?.match(/(\d+)m/)?.[1]);

    await act(async () => {
      vi.advanceTimersByTime(2 * 60000);
      await vi.runOnlyPendingTimersAsync();
    });

    const laterMatch = screen.getByText(/de energía en \d+m/).textContent;
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
        <NotificationsProvider>
          <AchievementsProvider>
            <OnboardingProvider>
            <Routes>
              <Route path="/inicio" element={<InicioPage />} />
              <Route path="/percibir" element={<div>Pantalla de percibir</div>} />
            </Routes>
            </OnboardingProvider>
          </AchievementsProvider>
        </NotificationsProvider>
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
    await screen.findByText("Nivel 2 · Explorador");
    expect(screen.queryByText("Hace 66 millones de años…")).toBeNull();
  });

  it("never shows the intro to an existing player, and records that", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile); // totalDiscoveries: 5
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2 · Explorador");
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
    expect(await screen.findByRole("group", { name: "Racha: 2 días seguidos" })).toBeTruthy();
    expect(screen.getByText("¡Juega hoy para no perder tu racha de 2 días seguidos!")).toBeTruthy();
    // Nothing is ready: the altar card says so and shows the closest species with how many cards are missing.
    expect(screen.getByText("Aún no hay fusiones listas")).toBeTruthy();
    expect(screen.getByText("Rex de Fuego")).toBeTruthy();
    expect(screen.getByText("Falta 2")).toBeTruthy();
    expect(document.querySelector(".fusion-card")?.className).not.toContain("is-active");
  });

  it("lights up the Fusion Altar and opens straight onto the species that is ready", async () => {
    getFuseEligibleMock.mockResolvedValue({
      threshold: 5,
      eligible: [{ speciesId: 2, commonName: "Destello del Pantano", scientificName: "T. mirus", balanceAnchorUrl: "/y.webp", balanceCount: 5 }],
      progress: [{ speciesId: 6, commonName: "Hustor de Umbra", scientificName: "H. inquisitus", balanceAnchorUrl: "/h.webp", balanceCount: 4 }],
    });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <NotificationsProvider>
          <AchievementsProvider>
            <OnboardingProvider>
            <Routes>
              <Route path="/inicio" element={<InicioPage />} />
              <Route path="/fusion" element={<div>Pantalla de fusión</div>} />
            </Routes>
            </OnboardingProvider>
          </AchievementsProvider>
        </NotificationsProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("1 especie lista para fusionar")).toBeTruthy();
    expect(document.querySelector(".fusion-card")?.className).toContain("is-active");
    expect(screen.getByText("Destello del Pantano")).toBeTruthy();
    expect(screen.getByText("Hustor de Umbra")).toBeTruthy();
    expect(screen.getByText("Falta 1")).toBeTruthy();
    // The unlock modal also pops the first time; it does not get in the way of the card.
    fireEvent.click(screen.getByRole("button", { name: "Fusionar" }));
    expect(await screen.findByText("Pantalla de fusión")).toBeTruthy();
  });

  it("shows the Primeros pasos checklist to a new account, with progress and the prize", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);
    getOnboardingMock.mockResolvedValue(newcomer(["account", "pack"]));

    renderPage();
    expect(await screen.findByText("Primeros pasos")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    expect(screen.getByText("+50 XP y ⚡ llena")).toBeTruthy();
    expect(screen.getByText(/Visitar tu EcoDex/)).toBeTruthy();
    expect(claimOnboardingMock).not.toHaveBeenCalled();
  });

  it("never shows the checklist to a veteran account, nor once the prize was claimed", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);

    renderPage();
    await screen.findByText("Nivel 2 · Explorador");
    expect(screen.queryByText("Primeros pasos")).toBeNull();
    cleanup();

    getOnboardingMock.mockResolvedValue({ ...newcomer(["account", "pack", "ecodex", "push", "mission"]), rewardClaimed: true });
    renderPage();
    await screen.findByText("Nivel 2 · Explorador");
    expect(screen.queryByText("Primeros pasos")).toBeNull();
    expect(claimOnboardingMock).not.toHaveBeenCalled();
  });

  it("claims the prize when every step is done and celebrates with a medal", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);
    getOnboardingMock.mockResolvedValue(newcomer(["account", "pack", "ecodex", "push", "mission"]));
    claimOnboardingMock.mockResolvedValue({ claimed: true, xp: { xpGained: 50, level: 2, previousLevel: 2, leveledUp: false } });

    renderPage();
    expect(await screen.findByRole("dialog", { name: "Primeros pasos completados" })).toBeTruthy();
    expect(claimOnboardingMock).toHaveBeenCalledTimes(1);
    // The checklist leaves once the prize is paid.
    expect(screen.queryByRole("progressbar", { name: "" })).toBeNull();
  });

  it("stays quiet when the server says there was nothing to claim", async () => {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);
    getOnboardingMock.mockResolvedValue(newcomer(["account", "pack", "ecodex", "push", "mission"]));
    claimOnboardingMock.mockResolvedValue({ claimed: false });

    renderPage();
    await screen.findByText("Nivel 2 · Explorador");
    await act(async () => {});
    expect(screen.queryByRole("dialog", { name: "Primeros pasos completados" })).toBeNull();
  });

  const allSteps = ["account", "pack", "ecodex", "push", "mission"];
  const paid = (xp: Partial<{ level: number; previousLevel: number; leveledUp: boolean }> = {}) => ({
    claimed: true,
    xp: { xpGained: 50, level: 2, previousLevel: 2, leveledUp: false, ...xp },
  });

  function quietHome() {
    getFuseEligibleMock.mockResolvedValue({ eligible: [] });
    getMyProfileMock.mockResolvedValue(profile);
    getEnergyMock.mockResolvedValue(null);
    getMissionsMock.mockResolvedValue(null);
  }

  it("pays the prize at once when 'Activar' on the checklist was the last step", async () => {
    quietHome();
    getOnboardingMock.mockResolvedValue(newcomer(["account", "pack", "ecodex", "mission"]));
    subscribeMock.mockResolvedValue(undefined);
    claimOnboardingMock.mockResolvedValue(paid());

    renderPage();
    const activate = await screen.findByRole("button", { name: "Activar" });
    getOnboardingMock.mockResolvedValue(newcomer(allSteps));
    fireEvent.click(activate);

    expect(await screen.findByRole("dialog", { name: "Primeros pasos completados" })).toBeTruthy();
    expect(claimOnboardingMock).toHaveBeenCalledTimes(1);
  });

  it("updates the XP and energy of the header as soon as the prize is paid", async () => {
    quietHome();
    getMyProfileMock.mockResolvedValueOnce(profile).mockResolvedValue({ ...profile, xpIntoLevel: 30 });
    getEnergyMock
      .mockResolvedValueOnce({ remaining: 0, max: 3, resetAt: null, unlimited: false })
      .mockResolvedValue({ remaining: 3, max: 3, resetAt: null, unlimited: false });
    getOnboardingMock.mockResolvedValue(newcomer(allSteps));
    claimOnboardingMock.mockResolvedValue(paid());

    renderPage();
    expect(await screen.findByText("30/40 XP")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Energía 3 de 3" })).toBeTruthy();
  });

  it("shows the level-up after the medal when the prize levels the player up", async () => {
    quietHome();
    getOnboardingMock.mockResolvedValue(newcomer(allSteps));
    claimOnboardingMock.mockResolvedValue(paid({ previousLevel: 1, level: 2, leveledUp: true }));

    renderPage();
    const medal = await screen.findByRole("dialog", { name: "Primeros pasos completados" });
    expect(screen.queryByRole("dialog", { name: "¡Subiste al nivel 2!" })).toBeNull();
    fireEvent.click(medal);

    const levelUp = await screen.findByRole("dialog", { name: "¡Subiste al nivel 2!" });
    // Outside .page (its own stacking context), or the bottom bar would sit on top of it.
    expect(levelUp.closest(".page")).toBeNull();
    fireEvent.click(levelUp);
    expect(screen.queryByRole("dialog", { name: "¡Subiste al nivel 2!" })).toBeNull();
  });

  describe("Fusion Altar unlock popup", () => {
    const ready = { speciesId: 2, commonName: "Destello del Pantano", scientificName: "T. mirus", balanceAnchorUrl: "/y.webp", balanceCount: 5 };
    const scrolled: Element[] = [];

    beforeEach(() => {
      scrolled.length = 0;
      // jsdom has no layout, so it does not implement scrollIntoView.
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this);
      };
      quietHome();
      getFuseEligibleMock.mockResolvedValue({ threshold: 5, eligible: [ready] });
    });

    afterEach(() => {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    });

    it("scrolls to the altar when 'Genial' confirms it, and only that first time", async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Genial" }));

      expect(screen.queryByText("¡Función desbloqueada!")).toBeNull();
      expect(scrolled).toHaveLength(1);
      expect(scrolled[0].querySelector(".fusion-card")).not.toBeNull();

      cleanup();
      renderPage();
      await screen.findByText("1 especie lista para fusionar");
      expect(screen.queryByRole("button", { name: "Genial" })).toBeNull();
      expect(scrolled).toHaveLength(1);
    });

    it("stays where it is when the popup is dismissed by tapping outside", async () => {
      renderPage();
      await screen.findByRole("button", { name: "Genial" });
      fireEvent.click(document.querySelector(".level-up-backdrop")!);

      expect(screen.queryByText("¡Función desbloqueada!")).toBeNull();
      expect(scrolled).toHaveLength(0);
    });
  });
});
