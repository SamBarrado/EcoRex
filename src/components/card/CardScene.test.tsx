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

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("CardScene", () => {
  it("shows the back face on mount, before flipping to front", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);

    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "visible" });
  });

  it("flips to the front face after the flip-in animation completes", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "hidden" });
    expect(screen.getByText("Test Dino")).toBeInTheDocument();
  });

  it("rotates to show the back face after dragging past the halfway point", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const perspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(perspective, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(perspective, { touches: [{ clientX: -300 }] });

    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "visible" });
  });

  it("snaps back to the front face when released near the starting position", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const perspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(perspective, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(perspective, { touches: [{ clientX: -50 }] });
    fireEvent.touchEnd(perspective);

    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "hidden" });
  });

  it("keeps the back face visible longer during an extended multi-spin flip-in", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} spins={2} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "visible" });

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "hidden" });
  });

  it("increases the rarity aura opacity as the card rotates away from flat", () => {
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const aura = screen.getByTestId("card-aura");
    const flatOpacity = Number(getComputedStyle(aura).opacity);

    const perspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(perspective, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(perspective, { touches: [{ clientX: -75 }] }); // ~45deg of spin

    const tiltedOpacity = Number(getComputedStyle(aura).opacity);
    expect(tiltedOpacity).toBeGreaterThan(flatOpacity);
  });

  it("renders only card-perspective as the gesture surface, with the flipper as a non-interactive child", () => {
    // jsdom doesn't load src/index.css, so this checks structure (the
    // .card-flipper class, which index.css pins to pointer-events:none)
    // rather than computed style.
    vi.useFakeTimers();
    render(<CardScene {...baseProps} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const perspective = screen.getByTestId("card-perspective");
    const flipper = perspective.firstChild as HTMLElement;
    expect(flipper).toHaveClass("card-flipper");
  });
});
