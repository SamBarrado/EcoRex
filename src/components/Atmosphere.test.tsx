import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Atmosphere, { atmosphereContext, energyFraction, energyMood } from "./Atmosphere";
import { PlayerProvider, usePlayer } from "../lib/PlayerContext";
import type { EnergyState } from "../lib/api";

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

const energy = (remaining: number, max = 4, extra: Partial<EnergyState> = {}): EnergyState => ({ remaining, max, resetAt: null, unlimited: false, ...extra });

describe("atmosphereContext", () => {
  it("maps each screen to its atmosphere", () => {
    expect(atmosphereContext("/inicio")).toBe("inicio");
    expect(atmosphereContext("/percibir")).toBe("percibir");
    expect(atmosphereContext("/coleccion")).toBe("coleccion");
    expect(atmosphereContext("/perfil")).toBe("perfil");
  });
  it("falls back to the dawn atmosphere for anything else (fusion, auth, unknown)", () => {
    expect(atmosphereContext("/fusion")).toBe("inicio");
    expect(atmosphereContext("/login")).toBe("inicio");
    expect(atmosphereContext("/")).toBe("inicio");
  });
});

describe("energy mood", () => {
  it("computes the share of energy left", () => {
    expect(energyFraction(energy(2, 4))).toBe(0.5);
    expect(energyFraction(energy(0, 3))).toBe(0);
    expect(energyFraction(energy(3, 3))).toBe(1);
  });
  it("treats unknown, unlimited and degenerate energy as full (never dims by mistake)", () => {
    expect(energyFraction(null)).toBe(1);
    expect(energyFraction(energy(0, 3, { unlimited: true }))).toBe(1);
    expect(energyFraction(energy(0, 0))).toBe(1);
  });
  it("classifies full / mid / empty", () => {
    expect(energyMood(energy(4, 4))).toBe("full");
    expect(energyMood(energy(2, 4))).toBe("mid");
    expect(energyMood(energy(0, 4))).toBe("empty");
    expect(energyMood(null)).toBe("full");
  });
});

function Pulser() {
  const { pulse } = usePlayer();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => pulse("gold")}>pulse</button>
      <button onClick={() => navigate("/percibir")}>go-percibir</button>
    </>
  );
}

function renderAtm(path = "/inicio") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PlayerProvider>
        <Atmosphere />
        <Pulser />
      </PlayerProvider>
    </MemoryRouter>
  );
}

const root = () => document.querySelector(".atm") as HTMLElement;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<Atmosphere />", () => {
  it("renders hidden from assistive tech and starts in the dawn atmosphere", async () => {
    getMyProfileMock.mockResolvedValue({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 });
    getEnergyMock.mockResolvedValue(energy(4, 4));
    renderAtm("/inicio");
    expect(root()).toHaveAttribute("aria-hidden", "true");
    expect(root().dataset.ctx).toBe("inicio");
    await waitFor(() => expect(root().dataset.energy).toBe("full"));
  });

  it("follows the route", async () => {
    getMyProfileMock.mockResolvedValue({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 });
    getEnergyMock.mockResolvedValue(energy(4, 4));
    renderAtm("/inicio");
    act(() => screen.getByText("go-percibir").click());
    expect(root().dataset.ctx).toBe("percibir");
  });

  it("dims when the player runs out of energy and exposes the share as a CSS variable", async () => {
    getMyProfileMock.mockResolvedValue({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 });
    getEnergyMock.mockResolvedValue(energy(0, 4));
    renderAtm();
    await waitFor(() => expect(root().dataset.energy).toBe("empty"));
    expect(root().style.getPropertyValue("--energy")).toBe("0.00");
  });

  it("flashes on a pulse, with the colour it was asked for, and replays on every pulse", async () => {
    getMyProfileMock.mockResolvedValue({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 });
    getEnergyMock.mockResolvedValue(energy(4, 4));
    renderAtm();
    expect(document.querySelector(".atm-hit")).toBeNull();
    act(() => screen.getByText("pulse").click());
    const first = document.querySelector(".atm-hit") as HTMLElement;
    expect(first.style.getPropertyValue("--hit")).toBe("gold");
    act(() => screen.getByText("pulse").click());
    const second = document.querySelector(".atm-hit") as HTMLElement;
    expect(second).not.toBe(first); // new element => the CSS animation restarts
  });

  it("includes the drifting particles that used to be unmounted dead code", () => {
    getMyProfileMock.mockResolvedValue({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 });
    getEnergyMock.mockResolvedValue(energy(4, 4));
    renderAtm();
    expect(document.querySelectorAll(".bg-particle").length).toBeGreaterThan(0);
  });
});
