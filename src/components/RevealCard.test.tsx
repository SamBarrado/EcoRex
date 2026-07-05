import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
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
});
