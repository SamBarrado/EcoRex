import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Card } from "./Card";

afterEach(() => {
  cleanup();
});

const baseProps = {
  imageUrl: "/img.png",
  commonName: "Coraza Llorona",
  scientificName: "Euoplocephalus lugubris",
  rarityTier: { slug: "singular", name: "Especie Rara" },
  fractaeChildName: "Tristeza",
  fractaeIconUrl: "/icons/fractae/tristeza.png",
  lorePhrase: "Bajo su armadura de piedra, carga el peso de cada especie que ya no camina junto a ella.",
  phase: "balance",
  glowColor: "#a35fe0",
};

describe("Card", () => {
  it("renders the common name, scientific name, Fractae name, phase and lore phrase", () => {
    render(<Card {...baseProps} />);

    expect(screen.getByText("Coraza Llorona")).toBeInTheDocument();
    expect(screen.getByText("Euoplocephalus lugubris")).toBeInTheDocument();
    expect(screen.getByText("Fractae · Tristeza")).toBeInTheDocument();
    expect(screen.getByText("balance")).toBeInTheDocument();
    expect(screen.getByText(/carga el peso de cada especie/)).toBeInTheDocument();
  });

  it("shows the rarity name without the 'Especie ' prefix, which the card has no room for", () => {
    render(<Card {...baseProps} />);

    expect(screen.getByText("Rara")).toHaveClass("card-rarity-pill");
    expect(screen.queryByText("Especie Rara")).not.toBeInTheDocument();
  });

  it("derives the frame tier from the rarity slug and lights that many pips", () => {
    const { container } = render(<Card {...baseProps} />);

    expect(screen.getByTestId("card-front")).toHaveClass("card-r2");
    expect(container.querySelectorAll(".card-pips i.on")).toHaveLength(3);
    expect(container.querySelectorAll(".card-pips i")).toHaveLength(5);
  });

  it("falls back to the weakest tier for an unknown rarity slug", () => {
    render(<Card {...baseProps} rarityTier={{ slug: "desconocida", name: "Especie ?" }} />);

    expect(screen.getByTestId("card-front")).toHaveClass("card-r0");
  });

  it("renders the Fractae medal image when fractaeIconUrl is given", () => {
    render(<Card {...baseProps} />);

    expect(screen.getByAltText("Fractae: Tristeza")).toHaveAttribute("src", "/icons/fractae/tristeza.png");
  });

  it("omits the Fractae medal when fractaeIconUrl is not given", () => {
    render(<Card {...baseProps} fractaeIconUrl={undefined} />);

    expect(screen.queryByAltText(/Fractae/)).not.toBeInTheDocument();
  });

  it("marks every image as non-draggable so a drag can't pick up a single layer", () => {
    render(<Card {...baseProps} />);

    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("draggable", "false");
    }
  });

  it("covers the front with the back only while `covered` is set", () => {
    const { rerender } = render(<Card {...baseProps} covered />);
    expect(screen.getByTestId("card-veil")).toBeInTheDocument();

    rerender(<Card {...baseProps} covered={false} />);
    expect(screen.queryByTestId("card-veil")).not.toBeInTheDocument();
  });

  it("builds the card edge from a stack of slices between the two faces", () => {
    const { container } = render(<Card {...baseProps} />);

    expect(container.querySelectorAll(".card-slice").length).toBeGreaterThanOrEqual(5);
  });
});
