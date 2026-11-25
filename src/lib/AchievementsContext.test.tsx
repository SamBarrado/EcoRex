import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { AchievementsProvider, useAchievements } from "./AchievementsContext";
import type { Achievement } from "./achievements";

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
});
