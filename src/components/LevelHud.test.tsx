import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import LevelHud from "./LevelHud";
import { PlayerProvider, usePlayer } from "../lib/PlayerContext";
import { NavVisibilityProvider, useNavVisibility } from "../lib/NavVisibilityContext";
import { AchievementsProvider, useAchievements } from "../lib/AchievementsContext";
import { flyOrbs } from "../lib/xpOrbs";

const getMyProfileMock = vi.fn();
const getEnergyMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getMyProfile: (...a: unknown[]) => getMyProfileMock(...a),
    getEnergy: (...a: unknown[]) => getEnergyMock(...a),
  };
});

function Controls() {
  const { hideNav, showNav } = useNavVisibility();
  const { refresh } = usePlayer();
  const location = useLocation();
  return (
    <>
      <span data-testid="path">{location.pathname}</span>
      <button onClick={hideNav}>hide</button>
      <button onClick={showNav}>show</button>
      <button onClick={refresh}>refresh</button>
    </>
  );
}

function renderHud(path = "/inicio") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavVisibilityProvider>
        <PlayerProvider>
          <LevelHud />
          <Controls />
        </PlayerProvider>
      </NavVisibilityProvider>
    </MemoryRouter>
  );
}

const profile = (level: number, into: number, next: number | null) => ({ level, xpIntoLevel: into, xpForNextLevel: next });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("<LevelHud />", () => {
  it("shows the level and an accessible description with the XP progress", async () => {
    getMyProfileMock.mockResolvedValue(profile(4, 60, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud();
    const hud = await screen.findByRole("button", { name: /Nivel 4, 60 de 140 XP/ });
    expect(hud).toHaveTextContent("4");
  });

  it("fills the ring in proportion to the XP into the level", async () => {
    getMyProfileMock.mockResolvedValue(profile(4, 70, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud();
    await screen.findByRole("button", { name: /Nivel 4/ });
    expect((document.querySelector(".level-hud-fill") as SVGElement).style.strokeDasharray).toBe("50 100");
  });

  it("shows a full ring and says so at the maximum level", async () => {
    getMyProfileMock.mockResolvedValue(profile(50, 0, null));
    getEnergyMock.mockResolvedValue({ remaining: 3, max: 5, resetAt: null });
    renderHud();
    await screen.findByRole("button", { name: /nivel máximo/ });
    expect((document.querySelector(".level-hud-fill") as SVGElement).style.strokeDasharray).toBe("100 100");
  });

  it("is hidden until the player data arrives (and when logged out)", async () => {
    getMyProfileMock.mockRejectedValue(new Error("401"));
    getEnergyMock.mockRejectedValue(new Error("401"));
    renderHud();
    await waitFor(() => expect(getMyProfileMock).toHaveBeenCalled());
    expect(document.querySelector(".level-hud")).toBeNull();
  });

  it.each(["/login", "/registro", "/elegir-usuario", "/privacidad"])("is hidden on %s", async (path) => {
    getMyProfileMock.mockResolvedValue(profile(4, 60, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud(path);
    await waitFor(() => expect(getMyProfileMock).toHaveBeenCalled());
    expect(document.querySelector(".level-hud")).toBeNull();
  });

  it("hides together with the bottom nav (immersive moments) and comes back with it", async () => {
    getMyProfileMock.mockResolvedValue(profile(4, 60, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud();
    await screen.findByRole("button", { name: /Nivel 4/ });
    act(() => screen.getByText("hide").click());
    expect(document.querySelector(".level-hud")).toBeNull();
    act(() => screen.getByText("show").click());
    expect(document.querySelector(".level-hud")).not.toBeNull();
  });

  it("flashes when XP or level change, and not on the first load", async () => {
    getMyProfileMock.mockResolvedValue(profile(4, 60, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud();
    const hud = await screen.findByRole("button", { name: /Nivel 4/ });
    expect(hud).not.toHaveClass("level-hud-gain");

    getMyProfileMock.mockResolvedValue(profile(4, 95, 140));
    act(() => screen.getByText("refresh").click());
    await waitFor(() => expect(screen.getByRole("button", { name: /95 de 140/ })).toHaveClass("level-hud-gain"));
  });

  it("opens the profile when tapped", async () => {
    getMyProfileMock.mockResolvedValue(profile(4, 60, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud();
    const hud = await screen.findByRole("button", { name: /Nivel 4/ });
    act(() => hud.click());
    expect(screen.getByTestId("path")).toHaveTextContent("/perfil");
  });
});

describe("<LevelHud /> while XP flies", () => {
  const wait = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  const ring = () => document.querySelector<HTMLElement>(".level-hud");
  const fill = () => (document.querySelector(".level-hud-fill") as SVGElement).style.strokeDasharray;
  // 4 orbs: the first lands at 1250 ms and the last at 1460 ms.
  const fly = () => act(() => void flyOrbs({ amount: 20 }));

  async function hudWith(path = "/inicio") {
    vi.useFakeTimers();
    getMyProfileMock.mockResolvedValue(profile(4, 70, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderHud(path);
    await wait(0);
  }

  async function gain() {
    getMyProfileMock.mockResolvedValue(profile(4, 105, 140));
    act(() => screen.getByText("refresh").click());
    await wait(0);
  }

  it("peeks over an immersive screen while the orbs fly, then leaves again", async () => {
    await hudWith("/percibir");
    act(() => screen.getByText("hide").click());
    expect(ring()).toBeNull();

    fly();
    expect(ring()).toHaveClass("level-hud-xp", "level-hud-peek", "level-hud-passive");

    await wait(1460 + 1100);
    expect(ring()).not.toBeNull();
    await wait(200);
    expect(ring()).toHaveClass("level-hud-leaving");
    await wait(400);
    expect(ring()).toBeNull();
  });

  it("keeps the old value until the first orb lands, so the ring is seen filling up", async () => {
    await hudWith();
    act(() => screen.getByText("hide").click());
    fly();
    await gain();
    await wait(1000);
    expect(fill()).toBe("50 100");
    expect(ring()).not.toHaveClass("level-hud-gain");

    await wait(300);
    expect(fill()).toBe("75 100");
    expect(ring()).toHaveClass("level-hud-gain");
  });

  it("stays after the flight where it is normally shown, and goes back to normal", async () => {
    await hudWith();
    fly();
    expect(ring()).toHaveClass("level-hud-xp");
    expect(ring()).not.toHaveClass("level-hud-peek", "level-hud-passive");

    await wait(4000);
    expect(ring()).not.toBeNull();
    expect(ring()).not.toHaveClass("level-hud-xp");
  });

  it("does not peek on the account screens", async () => {
    await hudWith("/login");
    fly();
    expect(ring()).toBeNull();
  });

  it("lets taps through to a medal it flies over", async () => {
    vi.useFakeTimers();
    getMyProfileMock.mockResolvedValue(profile(4, 70, 140));
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    let announce!: ReturnType<typeof useAchievements>["announce"];
    function Grab() {
      announce = useAchievements().announce;
      return null;
    }
    render(
      <MemoryRouter>
        <NavVisibilityProvider>
          <PlayerProvider>
            <AchievementsProvider>
              <LevelHud />
              <Grab />
            </AchievementsProvider>
          </PlayerProvider>
        </NavVisibilityProvider>
      </MemoryRouter>,
    );
    await wait(0);
    act(() => void announce([{ id: "m", kind: "medal", icon: "🎓", title: "Medalla", subtitle: "sub", color: "#ffd54a" }]));
    fly();
    expect(ring()).toHaveClass("level-hud-xp", "level-hud-passive");
  });
});

