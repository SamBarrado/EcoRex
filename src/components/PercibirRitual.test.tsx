import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PercibirRitual } from "./PercibirRitual";
import { ApiError, Species } from "../lib/api";
import { NavVisibilityProvider } from "../lib/NavVisibilityContext";
import { NotificationsProvider } from "../lib/NotificationsContext";

const species: Species[] = [
  {
    id: 1,
    scientific_name: "Testus dinus",
    common_name: "Test Dino",
    lore_phrase: "A test dino's tale.",
    fractae_child_name: "Testa",
    fractae_id: 1,
    fractae_slug: "t",
    fractae_color: null,
  },
];

const discoverResult = {
  discoveryId: 1,
  discoveryCode: "ABC123",
  speciesId: 1,
  scientificName: "Testus dinus",
  commonName: "Test Dino",
  phase: "balance",
  rarityTier: { slug: "registrada", name: "Registrada" },
  imageUrl: "/img.png",
  isUniqueVariant: false,
  isNewSlot: true,
  discoveredAt: "2026-01-01",
  xp: { xpGained: 10, totalXp: 100, level: 2, leveledUp: false },
};

// The component only renders the pack/track once its stage has a measured
// size (see the `stageSize.width > 0` gate), and jsdom's layout engine always
// reports zero-sized rects, so every element gets a fixed non-zero rect here.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 300,
    height: 600,
    top: 0,
    left: 0,
    right: 300,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON() {},
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

function renderRitual(props: Partial<React.ComponentProps<typeof PercibirRitual>> = {}) {
  return render(
    <MemoryRouter>
      <NavVisibilityProvider>
        <NotificationsProvider>
          <PercibirRitual species={species} discoverFn={vi.fn()} onUnauthorized={vi.fn()} {...props} />
        </NotificationsProvider>
      </NavVisibilityProvider>
    </MemoryRouter>
  );
}

function openPeek() {
  fireEvent.click(screen.getByTestId("envelope-pack"));
}

describe("PercibirRitual", () => {
  it("shows the sealed pack with a tap-to-open hint when idle", () => {
    renderRitual();

    expect(screen.getByTestId("envelope-pack")).toBeInTheDocument();
    expect(screen.getByText(/toca el sobre/i)).toBeInTheDocument();
  });

  it("reveals the drag track and hint once the pack is tapped", () => {
    renderRitual();

    openPeek();

    expect(screen.getByTestId("envelope-drag-line")).toBeInTheDocument();
    expect(screen.getByText(/desliza de izquierda a derecha/i)).toBeInTheDocument();
  });

  it("does not call discoverFn when the drag doesn't reach the tear threshold", () => {
    const discoverFn = vi.fn();
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(track);

    expect(discoverFn).not.toHaveBeenCalled();
  });

  it("calls discoverFn with the phase once the drag passes the tear threshold", () => {
    const discoverFn = vi.fn().mockReturnValue(new Promise(() => {}));
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    expect(discoverFn).toHaveBeenCalledWith({ phase: "balance" }, expect.anything());
  });

  it("reveals the card once discoverFn resolves and the ritual animation finishes", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue(discoverResult);
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("Test Dino")).toBeInTheDocument();
  });

  it("does not show the XP toast when the discovery grants 0 xp (a duplicate)", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue({
      ...discoverResult,
      isNewSlot: false,
      xp: { xpGained: 0, totalXp: 100, level: 2, leveledUp: false },
    });
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an error overlay with retry when discoverFn rejects", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockRejectedValue(new ApiError(500, "boom"));
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reintentar"));
    expect(screen.getByTestId("envelope-pack")).toBeInTheDocument();
  });

  it("resets to the sealed pack when a duplicate is confirmed via swipe-up", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue({ ...discoverResult, isNewSlot: false });
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    // The reveal mounts RevealCard, which schedules its own flip-in timer
    // from a useEffect that only runs once React commits — after the timer
    // flush above already returned. A second flush picks it up.
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText(/desliza hacia arriba/i)).toBeInTheDocument();

    const cardPerspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(cardPerspective, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchMove(cardPerspective, { touches: [{ clientX: 0, clientY: -150 }] });
    fireEvent.touchEnd(cardPerspective);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId("envelope-pack")).toBeInTheDocument();
    expect(screen.queryByTestId("envelope-drag-line")).not.toBeInTheDocument();
  });

  it("defers the level-up screen until the reveal is dismissed via swipe-up (duplicate)", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue({
      ...discoverResult,
      isNewSlot: false,
      xp: { xpGained: 10, totalXp: 100, previousLevel: 1, level: 2, leveledUp: true },
    });
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Card is revealed, but the level-up screen must not appear yet — it
    // would otherwise mount on top of the reveal at the same instant.
    expect(screen.getByText("Test Dino")).toBeInTheDocument();
    expect(screen.queryByText(/subiste de nivel/i)).not.toBeInTheDocument();

    const cardPerspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(cardPerspective, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchMove(cardPerspective, { touches: [{ clientX: 0, clientY: -150 }] });
    fireEvent.touchEnd(cardPerspective);

    // onCommitUp fires after RevealCard's own fly-away animation timer.
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Swiping up surfaces the level-up screen instead of resetting the pack.
    expect(screen.getByText(/subiste de nivel/i)).toBeInTheDocument();
    expect(screen.queryByTestId("envelope-pack")).not.toBeInTheDocument();

    // Dismissing it is what finally resets to the sealed pack.
    fireEvent.click(screen.getByText(/subiste de nivel/i));

    expect(screen.getByTestId("envelope-pack")).toBeInTheDocument();
    expect(screen.queryByText(/subiste de nivel/i)).not.toBeInTheDocument();
  });

  it("defers the level-up screen until the reveal is dismissed via swipe-up (new species)", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue({
      ...discoverResult,
      isNewSlot: true,
      xp: { xpGained: 60, totalXp: 100, previousLevel: 1, level: 2, leveledUp: true },
    });
    renderRitual({ discoverFn });
    openPeek();

    const track = screen.getByTestId("envelope-drag-line");
    fireEvent.touchStart(track, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(track, { touches: [{ clientX: 290 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const cardPerspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(cardPerspective, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchMove(cardPerspective, { touches: [{ clientX: 0, clientY: -150 }] });
    fireEvent.touchEnd(cardPerspective);

    // onCommitUp fires after RevealCard's own fly-away animation timer.
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Level-up screen shows; the "new species" toast must not appear yet.
    expect(screen.getByText(/subiste de nivel/i)).toBeInTheDocument();
    expect(screen.queryByText(/nueva especie registrada/i)).not.toBeInTheDocument();

    // Dismissing it is what finally proceeds to the new-species toast.
    fireEvent.click(screen.getByText(/subiste de nivel/i));

    expect(screen.getByText(/nueva especie registrada/i)).toBeInTheDocument();
  });
});
