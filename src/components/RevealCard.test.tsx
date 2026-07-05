import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { RevealCard } from "./RevealCard";

const baseProps = {
  imageUrl: "/img.png",
  commonName: "Test Dino",
  scientificName: "Testus dinus",
  phase: "calma",
  rarityTier: { slug: "registrada", name: "Registrada" },
  discoveryCode: "ABC123",
  glowColor: "#bfe6c9",
};

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("RevealCard", () => {
  it("shows the back face on mount, before flipping to front", () => {
    vi.useFakeTimers();
    render(<RevealCard {...baseProps} />);

    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "visible" });
    expect(screen.getByAltText("Test Dino")).toHaveStyle({ visibility: "hidden" });
  });

  it("flips to the front face after the flip-in animation completes", () => {
    vi.useFakeTimers();
    render(<RevealCard {...baseProps} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByAltText("Test Dino")).toHaveStyle({ visibility: "visible" });
    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "hidden" });
  });

  it("applies the given glow color to the front face border", () => {
    vi.useFakeTimers();
    render(<RevealCard {...baseProps} glowColor="#e0a02f" />);

    expect(screen.getByTestId("card-front")).toHaveStyle({ borderColor: "#e0a02f" });
  });

  it("rotates to show the back face after dragging past the halfway point", () => {
    vi.useFakeTimers();
    render(<RevealCard {...baseProps} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const perspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(perspective, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(perspective, { touches: [{ clientX: -300 }] });

    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "visible" });
    expect(screen.getByAltText("Test Dino")).toHaveStyle({ visibility: "hidden" });
  });

  it("snaps back to the front face when released near the starting position", () => {
    vi.useFakeTimers();
    render(<RevealCard {...baseProps} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const perspective = screen.getByTestId("card-perspective");
    fireEvent.touchStart(perspective, { touches: [{ clientX: 0 }] });
    fireEvent.touchMove(perspective, { touches: [{ clientX: -50 }] });
    fireEvent.touchEnd(perspective);

    expect(screen.getByAltText("Test Dino")).toHaveStyle({ visibility: "visible" });
    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "hidden" });
  });

  it("keeps the back face visible longer during an extended multi-spin flip-in", () => {
    vi.useFakeTimers();
    render(<RevealCard {...baseProps} spins={2} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "visible" });
    expect(screen.getByAltText("Test Dino")).toHaveStyle({ visibility: "hidden" });

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByAltText("Test Dino")).toHaveStyle({ visibility: "visible" });
    expect(screen.getByAltText("Ecorex")).toHaveStyle({ visibility: "hidden" });
  });
});
