import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MissionsCard } from "./MissionsCard";
import type { MissionsState } from "../lib/api";

afterEach(cleanup);

const missions: MissionsState = {
  day: "2026-11-18",
  missions: [
    { slug: "percibir", label: "Percibe hoy", progress: 1, target: 1, completed: true, optional: false },
    { slug: "coleccionista", label: "Consigue 3 cartas hoy", progress: 1, target: 3, completed: false, optional: false },
    { slug: "fusion", label: "Completa 1 fusión (extra)", progress: 0, target: 1, completed: false, optional: true },
  ],
  bonus: { completed: false, xp: 30 },
};

describe("MissionsCard", () => {
  it("renders nothing without data", () => {
    const { container } = render(<MissionsCard missions={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists every mission with its progress, marking completed ones", () => {
    render(<MissionsCard missions={missions} />);
    expect(screen.getByText("✓ Percibe hoy")).toBeTruthy();
    expect(screen.getByText("Consigue 3 cartas hoy")).toBeTruthy();
    expect(screen.getByText("1/3")).toBeTruthy();
    expect(screen.getByText("Completa 1 fusión (extra)")).toBeTruthy();
  });

  it("describes the bonus as depending on the main missions, not all of them", () => {
    render(<MissionsCard missions={missions} />);
    expect(screen.getByText("Bonus: completa las misiones principales")).toBeTruthy();
    expect(screen.getByText("+30 XP")).toBeTruthy();
  });
});
