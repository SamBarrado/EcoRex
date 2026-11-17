import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { CardScene } from "./CardScene";

const baseProps = {
  imageUrl: "/img.png",
  commonName: "Test Dino",
  scientificName: "Testus dinus",
  rarityTier: { slug: "registrada", name: "Registrada" },
  glowColor: "#bfe6c9",
};

// Long enough for the whole reveal: intro + covered pause + scan.
const REVEAL_MS = 2500;

function pointer(type: "pointerDown" | "pointerMove" | "pointerUp", el: HTMLElement, x = 0, y = 0) {
  fireEvent[type](el, { clientX: x, clientY: y, pointerId: 1, pointerType: "touch" });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("CardScene reveal", () => {
  it("starts covered by the card's back, so the front is never seen first", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);

    expect(screen.getByTestId("card-veil")).toBeInTheDocument();
    expect(screen.getByTestId("card-perspective").closest(".card-scene")).toHaveAttribute("data-revealed", "false");
  });

  it("stays covered during the intro and the pause before the scan", async () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);

    await advance(500);

    expect(screen.getByTestId("card-veil")).toBeInTheDocument();
  });

  it("uncovers the front once the scan completes", async () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);

    await advance(REVEAL_MS);

    expect(screen.queryByTestId("card-veil")).not.toBeInTheDocument();
    expect(screen.getByText("Test Dino")).toBeInTheDocument();
    expect(screen.getByTestId("card-perspective").closest(".card-scene")).toHaveAttribute("data-revealed", "true");
  });

  it("skips the reveal entirely with reveal='none'", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} reveal="none" />);

    expect(screen.queryByTestId("card-veil")).not.toBeInTheDocument();
  });

  it("finishes the reveal on the spot when the card is grabbed mid-scan", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);

    pointer("pointerDown", screen.getByTestId("card-perspective"));

    expect(screen.queryByTestId("card-veil")).not.toBeInTheDocument();
  });
});

describe("CardScene rotation", () => {
  async function revealed() {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);
    await advance(REVEAL_MS);
    return screen.getByTestId("card-perspective");
  }

  it("springs onto the back face after being dragged past the halfway point", async () => {
    const perspective = await revealed();
    const scene = perspective.closest(".card-scene")!;

    pointer("pointerDown", perspective, 0, 0);
    await advance(500); // a slow drag: no flick velocity at release
    pointer("pointerMove", perspective, -200, 0); // 200px * 0.6 = 120deg
    pointer("pointerUp", perspective, -200, 0);
    await advance(1500);

    expect(scene).toHaveAttribute("data-facing", "back");
  });

  it("springs back to the front face when released near the starting position", async () => {
    const perspective = await revealed();
    const scene = perspective.closest(".card-scene")!;

    pointer("pointerDown", perspective, 0, 0);
    await advance(500);
    pointer("pointerMove", perspective, -50, 0); // 30deg
    pointer("pointerUp", perspective, -50, 0);
    await advance(1500);

    expect(scene).toHaveAttribute("data-facing", "front");
  });

  it("is a single gesture surface whose images ignore the pointer (no native image drag)", async () => {
    const perspective = await revealed();

    const dragStart = new Event("dragstart", { bubbles: true, cancelable: true });
    perspective.dispatchEvent(dragStart);

    expect(dragStart.defaultPrevented).toBe(true);
    for (const img of perspective.querySelectorAll("img")) {
      expect(img).toHaveAttribute("draggable", "false");
    }
  });
});

describe("CardScene swipe up", () => {
  async function revealedWithCommit() {
    vi.useFakeTimers();
    const onCommitUp = vi.fn();
    render(<CardScene {...baseProps} onCommitUp={onCommitUp} />);
    await advance(REVEAL_MS);
    return { perspective: screen.getByTestId("card-perspective"), onCommitUp };
  }

  it("shows the swipe-up hint only after the card is uncovered", async () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} onCommitUp={vi.fn()} />);
    expect(screen.queryByText(/desliza hacia arriba/i)).not.toBeInTheDocument();

    await advance(REVEAL_MS);

    expect(screen.getByText(/desliza hacia arriba/i)).toBeInTheDocument();
  });

  it("calls onCommitUp after a long swipe up and the fly-away animation", async () => {
    const { perspective, onCommitUp } = await revealedWithCommit();

    pointer("pointerDown", perspective, 0, 0);
    pointer("pointerMove", perspective, 0, -150);
    pointer("pointerUp", perspective, 0, -150);
    expect(onCommitUp).not.toHaveBeenCalled();

    await advance(400);

    expect(onCommitUp).toHaveBeenCalledTimes(1);
  });

  it("does not commit on a short swipe", async () => {
    const { perspective, onCommitUp } = await revealedWithCommit();

    pointer("pointerDown", perspective, 0, 0);
    pointer("pointerMove", perspective, 0, -40);
    pointer("pointerUp", perspective, 0, -40);
    await advance(600);

    expect(onCommitUp).not.toHaveBeenCalled();
  });
});
