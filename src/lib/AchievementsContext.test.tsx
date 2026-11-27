import { StrictMode } from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { AchievementsProvider, useAchievements } from "./AchievementsContext";
import type { Achievement } from "./achievements";
import { LevelUpScreen } from "../components/LevelUpScreen";

const medal = (id: string, title: string): Achievement => ({ id, kind: "medal", icon: "🦖", title, subtitle: "sub", color: "#7fc891" });
const banner = (id: string, title: string): Achievement => ({ id, kind: "banner", icon: "✅", title, subtitle: "sub", color: "#3fae5a" });

let announce: ReturnType<typeof useAchievements>["announce"];
function Grab() {
  announce = useAchievements().announce;
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  render(
    <AchievementsProvider>
      <Grab />
    </AchievementsProvider>,
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AchievementsProvider", () => {
  it("resolves at once when there are only banners, and they fade on their own", async () => {
    let done = false;
    act(() => {
      announce([banner("a", "Misión completada")]).then(() => (done = true));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(done).toBe(true);
    expect(screen.getByText("Misión completada")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4200);
    });
    expect(screen.queryByText("Misión completada")).toBeNull();
  });

  it("keeps at most 3 banners on screen", () => {
    act(() => {
      void announce([banner("1", "Uno"), banner("2", "Dos"), banner("3", "Tres"), banner("4", "Cuatro")]);
    });
    expect(screen.queryByText("Uno")).toBeNull();
    expect(screen.getByText("Cuatro")).toBeTruthy();
  });

  it("shows medals one at a time and resolves only after the last is dismissed", async () => {
    let done = false;
    act(() => {
      announce([medal("m1", "Primera"), medal("m2", "Segunda")]).then(() => (done = true));
    });
    expect(screen.getByRole("dialog", { name: "Primera" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Segunda" })).toBeNull();

    fireEvent.click(screen.getByRole("dialog", { name: "Primera" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(done).toBe(false);
    expect(screen.getByRole("dialog", { name: "Segunda" })).toBeTruthy();

    fireEvent.click(screen.getByRole("dialog", { name: "Segunda" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(done).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  const wait = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  it("holds the banners while a medal is up and then shows them for their whole time", async () => {
    act(() => {
      void announce([medal("m1", "Nueva especie"), banner("a", "Misión completada")]);
    });
    await wait(10_000);
    expect(screen.queryByText("Misión completada")).toBeNull();

    fireEvent.click(screen.getByRole("dialog", { name: "Nueva especie" }));
    await wait(3000);
    expect(screen.getByText("Misión completada")).toBeTruthy();
    await wait(1200);
    expect(screen.queryByText("Misión completada")).toBeNull();
  });

  it("holds the banners while the level-up screen is open", async () => {
    cleanup();
    const view = (levelUp: boolean) => (
      <AchievementsProvider>
        <Grab />
        {levelUp && <LevelUpScreen previousLevel={1} level={2} onClose={() => {}} />}
      </AchievementsProvider>
    );
    const { rerender } = render(view(false));
    act(() => {
      void announce([banner("a", "Misión completada")]);
    });
    await wait(1000);
    rerender(view(true)); // the level-up covers a banner already on screen
    await wait(10_000);
    expect(screen.queryByText("Misión completada")).toBeNull();

    rerender(view(false));
    await wait(3000);
    expect(screen.getByText("Misión completada")).toBeTruthy();
  });

  it("tells a queued medal when it is actually shown, only once", async () => {
    cleanup();
    render(
      <StrictMode>
        <AchievementsProvider>
          <Grab />
        </AchievementsProvider>
      </StrictMode>,
    );
    const onShow = vi.fn();
    act(() => {
      void announce([medal("m1", "Primera"), { ...medal("m2", "Segunda"), onShow }]);
    });
    expect(onShow).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog", { name: "Primera" }));
    await wait(0);
    expect(onShow).toHaveBeenCalledTimes(1);
  });
});
