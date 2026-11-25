import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { FusionAltarCard } from "./FusionAltarCard";
import type { EligibleSpecies } from "../../lib/api";

afterEach(cleanup);

const sp = (id: number, name: string, n: number): EligibleSpecies => ({ speciesId: id, commonName: name, scientificName: "x", balanceAnchorUrl: `/${id}.webp`, balanceCount: n });

describe("FusionAltarCard", () => {
  it("with nothing gathered it explains how to start, with no dead lock", () => {
    render(<FusionAltarCard eligible={[]} next={undefined} threshold={5} onFuse={() => {}} />);
    expect(screen.getByText("Junta 5 cartas Balance de una especie para fusionarlas")).toBeTruthy();
    expect(document.querySelector(".fusion-card")?.className).not.toContain("is-active");
  });

  it("shows the closest species when nothing is ready yet", () => {
    render(<FusionAltarCard eligible={[]} next={sp(1, "Hustor", 4)} threshold={5} onFuse={() => {}} />);
    expect(screen.getByText("Aún no hay fusiones listas")).toBeTruthy();
    expect(screen.getByText("Falta 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Fusionar" })).toBeNull();
  });

  it("glows, counts what is ready and fuses straight from the row", () => {
    const onFuse = vi.fn();
    render(<FusionAltarCard eligible={[sp(2, "Destello", 5), sp(3, "Otro", 6)]} next={sp(1, "Hustor", 4)} threshold={5} onFuse={onFuse} />);
    expect(document.querySelector(".fusion-card")?.className).toContain("is-active");
    expect(screen.getByText("2 especies listas para fusionar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fusionar" }));
    expect(onFuse).toHaveBeenCalledWith(2);
  });

  it("the header opens the altar without picking a species", () => {
    const onFuse = vi.fn();
    render(<FusionAltarCard eligible={[]} next={undefined} threshold={5} onFuse={onFuse} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir el Altar de Fusión" }));
    expect(onFuse).toHaveBeenCalledWith();
  });

  it("draws one slot per card needed, lit for the cards gathered", () => {
    render(<FusionAltarCard eligible={[]} next={sp(1, "Hustor", 3)} threshold={5} onFuse={() => {}} />);
    const slots = screen.getByRole("img", { name: "3 de 5 cartas Balance" });
    expect(slots.querySelectorAll("i")).toHaveLength(5);
    expect(slots.querySelectorAll("i.on")).toHaveLength(3);
  });
});
