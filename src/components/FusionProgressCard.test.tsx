import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FusionProgressCard } from "./FusionProgressCard";

afterEach(cleanup);

const species = {
  speciesId: 7,
  commonName: "Rex de Fuego",
  scientificName: "Tyrannosaurus imperator",
  balanceAnchorUrl: "/x.webp",
  balanceCount: 3,
};

describe("FusionProgressCard", () => {
  it("renders nothing without a species", () => {
    const { container } = render(<FusionProgressCard species={undefined} threshold={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows count, threshold and a proportional bar", () => {
    render(<FusionProgressCard species={species} threshold={5} />);
    expect(screen.getByText(/Próxima fusión:/).textContent).toContain("Rex de Fuego");
    expect(screen.getByText("3/5")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect((bar.firstChild as HTMLElement).style.width).toBe("60%");
  });

  it("respects the lower level-15 threshold and a custom label", () => {
    render(<FusionProgressCard species={{ ...species, balanceCount: 2 }} threshold={4} label="" />);
    expect(screen.getByText("2/4")).toBeTruthy();
    expect(screen.queryByText(/Próxima fusión/)).toBeNull();
  });
});
