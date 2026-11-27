import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OnboardingProvider, useOnboarding } from "./OnboardingContext";
import { AchievementsProvider, useAchievements } from "./AchievementsContext";
import { NotificationsProvider } from "./NotificationsContext";
import { onXpFlight } from "./xpOrbs";
import type { OnboardingState } from "./api";

const getOnboardingMock = vi.fn();
const claimOnboardingMock = vi.fn();

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    getOnboarding: (...a: unknown[]) => getOnboardingMock(...a),
    claimOnboarding: (...a: unknown[]) => claimOnboardingMock(...a),
    getNotifications: () => Promise.resolve({ notifications: [] }),
  };
});

const SLUGS = ["account", "pack", "ecodex", "push", "mission"] as const;
const state = (done: number, extra: Partial<OnboardingState> = {}): OnboardingState => ({
  eligible: true,
  rewardClaimed: false,
  steps: SLUGS.map((slug, i) => ({ slug, done: i < done })),
  ...extra,
});
const paidClaim = (leveledUp = false) => ({ claimed: true, xp: { xpGained: 50, level: 2, previousLevel: leveledUp ? 1 : 2, leveledUp } });

let onboarding: ReturnType<typeof useOnboarding>;
let announce: ReturnType<typeof useAchievements>["announce"];
function Grab() {
  onboarding = useOnboarding();
  announce = useAchievements().announce;
  return null;
}

const flights = vi.fn();
let unsubscribe: () => void;

const wait = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

async function check(options?: { fresh?: boolean }) {
  let result: OnboardingState | null = null;
  await act(async () => {
    result = await onboarding.check(options);
  });
  return result as OnboardingState | null;
}

const medal = () => screen.queryByRole("dialog", { name: "Primeros pasos completados" });

beforeEach(() => {
  vi.useFakeTimers();
  unsubscribe = onXpFlight(flights);
  render(
    <MemoryRouter>
      <NotificationsProvider>
        <AchievementsProvider>
          <OnboardingProvider>
            <Grab />
          </OnboardingProvider>
        </AchievementsProvider>
      </NotificationsProvider>
    </MemoryRouter>,
  );
});

afterEach(() => {
  unsubscribe();
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("OnboardingProvider", () => {
  it("does nothing while a step is missing", async () => {
    getOnboardingMock.mockResolvedValue(state(4));
    expect((await check())?.rewardClaimed).toBe(false);
    expect(claimOnboardingMock).not.toHaveBeenCalled();
    expect(medal()).toBeNull();
  });

  it("collects the prize with a medal and the XP flying to the ring", async () => {
    getOnboardingMock.mockResolvedValue(state(5));
    claimOnboardingMock.mockResolvedValue(paidClaim());

    expect((await check())?.rewardClaimed).toBe(true);
    expect(medal()).not.toBeNull();
    expect(flights).toHaveBeenCalledTimes(1);
    expect(onboarding.paid).toBe(1);
  });

  it("launches the XP when its medal shows, not while another one is in front", async () => {
    getOnboardingMock.mockResolvedValue(state(5));
    claimOnboardingMock.mockResolvedValue(paidClaim());
    act(() => void announce([{ id: "s", kind: "medal", icon: "🦖", title: "Nueva especie", subtitle: "sub", color: "#7fc891" }]));

    await check();
    expect(flights).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog", { name: "Nueva especie" }));
    await wait();
    expect(flights).toHaveBeenCalledTimes(1);
  });

  it("shows the level-up after the medal", async () => {
    getOnboardingMock.mockResolvedValue(state(5));
    claimOnboardingMock.mockResolvedValue(paidClaim(true));
    await check();
    expect(screen.queryByRole("dialog", { name: "¡Subiste al nivel 2!" })).toBeNull();

    fireEvent.click(medal()!);
    await wait();
    fireEvent.click(screen.getByRole("dialog", { name: "¡Subiste al nivel 2!" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("claims once when two actions ask at the same time", async () => {
    getOnboardingMock.mockResolvedValueOnce(state(5)).mockResolvedValue(state(5, { rewardClaimed: true }));
    claimOnboardingMock.mockResolvedValue(paidClaim());
    await act(async () => {
      await Promise.all([onboarding.check(), onboarding.check()]);
    });
    expect(claimOnboardingMock).toHaveBeenCalledTimes(1);
  });

  it("stops asking once there is nothing left to collect, unless asked for a fresh read", async () => {
    getOnboardingMock.mockResolvedValue(state(2, { eligible: false }));
    await check();
    await check();
    expect(getOnboardingMock).toHaveBeenCalledTimes(1);

    // Another account may have signed in: Inicio reads again.
    getOnboardingMock.mockResolvedValue(state(2));
    expect((await check({ fresh: true }))?.eligible).toBe(true);
    await check();
    expect(getOnboardingMock).toHaveBeenCalledTimes(3);
  });

  it("stays quiet and keeps the state when collecting fails", async () => {
    getOnboardingMock.mockResolvedValue(state(5));
    claimOnboardingMock.mockRejectedValue(new Error("offline"));
    expect((await check())?.rewardClaimed).toBe(false);
    expect(medal()).toBeNull();
  });
});
