import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Card } from "./Card";

afterEach(() => {
  cleanup();
});

const baseProps = {
  facing: "front" as const,
  rotateY: 0,
  transition: "none",
  imageUrl: "/img.png",
  commonName: "Coraza Llorona",
  scientificName: "Euoplocephalus lugubris",
  rarityTier: { slug: "singular", name: "Especie Rara" },
  fractaeChildName: "Tristeza",
  fractaeIconUrl: "/icons/fractae/tristeza.png",
  lorePhrase: "Bajo su armadura de piedra, carga el peso de cada especie que ya no camina junto a ella.",
  glowColor: "#a35fe0",
  auraOpacity: 0.4,
};

describe("Card", () => {
  it("renders the common name, scientific name, Fractae name and lore phrase", () => {
    render(<Card {...baseProps} />);

    expect(screen.getByText("Coraza Llorona")).toBeInTheDocument();
    expect(screen.getByText("Euoplocephalus lugubris")).toBeInTheDocument();
    expect(screen.getByText("Fractae: Tristeza")).toBeInTheDocument();
    expect(screen.getByText(/carga el peso de cada especie/)).toBeInTheDocument();
  });

  it("renders the rarity name as a pill instead of plain 'Rareza: X' text", () => {
    render(<Card {...baseProps} />);

    expect(screen.getByText("Especie Rara")).toHaveClass("card-rarity-pill");
    expect(screen.queryByText(/Rareza:/)).not.toBeInTheDocument();
  });

  it("renders the Fractae badge image when fractaeIconUrl is given", () => {
    render(<Card {...baseProps} />);

    expect(screen.getByAltText("Fractae: Tristeza")).toHaveAttribute(
      "src",
      "/icons/fractae/tristeza.png",
    );
  });

  it("omits the Fractae badge when fractaeIconUrl is not given", () => {
    render(<Card {...baseProps} fractaeIconUrl={undefined} />);

    expect(screen.queryByAltText(/Fractae/)).not.toBeInTheDocument();
  });

  it("marks every image as non-draggable so mobile can't isolate a single layer", () => {
    render(<Card {...baseProps} />);

    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("draggable", "false");
    }
  });

  it("applies the rarity-derived aura color and opacity", () => {
    render(<Card {...baseProps} auraOpacity={0.7} />);

    expect(screen.getByTestId("card-aura")).toHaveStyle({ opacity: "0.7" });
  });
});
