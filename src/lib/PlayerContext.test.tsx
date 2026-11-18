import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./PlayerContext";

const getMyProfileMock = vi.fn();
const getEnergyMock = vi.fn();

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    getMyProfile: (...a: unknown[]) => getMyProfileMock(...a),
    getEnergy: (...a: unknown[]) => getEnergyMock(...a),
  };
});

function Probe() {
  const { progress, energy, hit, refresh, pulse } = usePlayer();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="level">{progress ? progress.level : "none"}</span>
      <span data-testid="energy">{energy ? `${energy.remaining}/${energy.max}` : "none"}</span>
      <span data-testid="hit">{hit ? `${hit.id}:${hit.color}` : "none"}</span>
      <button onClick={refresh}>refresh</button>
      <button onClick={() => pulse("gold")}>pulse</button>
      <button onClick={() => pulse()}>pulse-default</button>
      <button onClick={() => navigate("/perfil")}>go</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <MemoryRouter initialEntries={["/inicio"]}>
      <PlayerProvider>
        <Probe />
      </PlayerProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PlayerProvider", () => {
  it("loads level/xp and energy on mount", async () => {
    getMyProfileMock.mockResolvedValue({ level: 4, xpIntoLevel: 60, xpForNextLevel: 140 });
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("level")).toHaveTextContent("4"));
    expect(screen.getByTestId("energy")).toHaveTextContent("2/3");
  });

  it("re-syncs on every route change and on demand", async () => {
    getMyProfileMock.mockResolvedValue({ level: 4, xpIntoLevel: 60, xpForNextLevel: 140 });
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 3, resetAt: null });
    renderProbe();
    await waitFor(() => expect(getMyProfileMock).toHaveBeenCalledTimes(1));

    getMyProfileMock.mockResolvedValue({ level: 5, xpIntoLevel: 10, xpForNextLevel: 160 });
    act(() => screen.getByText("go").click());
    await waitFor(() => expect(screen.getByTestId("level")).toHaveTextContent("5"));

    getEnergyMock.mockResolvedValue({ remaining: 0, max: 4, resetAt: 123 });
    act(() => screen.getByText("refresh").click());
    await waitFor(() => expect(screen.getByTestId("energy")).toHaveTextContent("0/4"));
  });

  it("falls back to an empty snapshot when logged out (401)", async () => {
    getMyProfileMock.mockRejectedValue(new Error("401"));
    getEnergyMock.mockRejectedValue(new Error("401"));
    renderProbe();
    await waitFor(() => expect(getMyProfileMock).toHaveBeenCalled());
    expect(screen.getByTestId("level")).toHaveTextContent("none");
    expect(screen.getByTestId("energy")).toHaveTextContent("none");
  });

  it("emits unique, increasing background pulses", async () => {
    getMyProfileMock.mockResolvedValue({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50 });
    getEnergyMock.mockResolvedValue({ remaining: 3, max: 3, resetAt: null });
    renderProbe();
    act(() => screen.getByText("pulse").click());
    expect(screen.getByTestId("hit")).toHaveTextContent("1:gold");
    act(() => screen.getByText("pulse").click());
    expect(screen.getByTestId("hit")).toHaveTextContent("2:gold");
    act(() => screen.getByText("pulse-default").click());
    expect(screen.getByTestId("hit").textContent).toMatch(/^3:hsl\(/);
  });
});

describe("usePlayer outside a provider", () => {
  it("is a harmless no-op", () => {
    function Bare() {
      const p = usePlayer();
      p.refresh();
      p.pulse();
      return <span data-testid="bare">{p.progress === null && p.energy === null ? "empty" : "?"}</span>;
    }
    render(<Bare />);
    expect(screen.getByTestId("bare")).toHaveTextContent("empty");
  });
});
