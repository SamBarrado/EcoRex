import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import LevelHud from "./LevelHud";
import { PlayerProvider, usePlayer } from "../lib/PlayerContext";
import { NavVisibilityProvider, useNavVisibility } from "../lib/NavVisibilityContext";

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
