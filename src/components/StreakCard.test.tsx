import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StreakCard } from "./StreakCard";

afterEach(cleanup);

describe("StreakCard", () => {
  it("renders nothing without data", () => {
    const { container } = render(<StreakCard streak={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("invites the player to start a streak when there is none", () => {
    render(<StreakCard streak={{ days: 0, activeToday: false, nextMilestone: 3, nextMilestoneXp: 20 }} />);
    expect(screen.getByText(/empieza una racha/)).toBeTruthy();
    expect(screen.getByText(/A los 3 días: \+20 XP/)).toBeTruthy();
  });

  it("shows the streak and the next reward", () => {
    render(<StreakCard streak={{ days: 4, activeToday: true, nextMilestone: 7, nextMilestoneXp: 50 }} />);
    expect(screen.getByText("🔥 Racha: 4 días seguidos")).toBeTruthy();
    expect(screen.getByText("En 3 días: +50 XP y energía")).toBeTruthy();
    expect(screen.queryByText(/no perderla/)).toBeNull();
  });

  it("says 'Mañana' when the reward is one day away", () => {
    render(<StreakCard streak={{ days: 2, activeToday: true, nextMilestone: 3, nextMilestoneXp: 20 }} />);
    expect(screen.getByText("Mañana: +20 XP y energía")).toBeTruthy();
  });

  it("warns that a live streak is at risk until the player plays today", () => {
    render(<StreakCard streak={{ days: 5, activeToday: false, nextMilestone: 7, nextMilestoneXp: 50 }} />);
    expect(screen.getByText("¡Juega hoy para no perderla!")).toBeTruthy();
  });

  it("uses the singular for a one-day streak", () => {
    render(<StreakCard streak={{ days: 1, activeToday: true, nextMilestone: 3, nextMilestoneXp: 20 }} />);
    expect(screen.getByText("🔥 Racha: 1 día seguido")).toBeTruthy();
  });
});
