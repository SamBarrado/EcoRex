import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WelcomeFlow, hasSeenWelcome, markWelcomeSeen } from "./WelcomeFlow";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("WelcomeFlow", () => {
  it("walks through the three slides and offers to start playing on the last", () => {
    const onFinish = vi.fn();
    render(<WelcomeFlow onFinish={onFinish} />);

    expect(screen.getByText("Hace 66 millones de años…")).toBeTruthy();
    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("Los Fractae")).toBeTruthy();
    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("Tú puedes percibirlos")).toBeTruthy();
    expect(screen.queryByText("Siguiente")).toBeNull();

    fireEvent.click(screen.getByText("Percibir mi primera carta"));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("has no way to skip: the only action on each slide moves forward, and it only finishes on the last", () => {
    const onFinish = vi.fn();
    render(<WelcomeFlow onFinish={onFinish} />);

    expect(screen.queryByText(/saltar/i)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.queryByText(/saltar/i)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByText("Siguiente"));
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("remembers per user that the intro was seen", () => {
    expect(hasSeenWelcome(1)).toBe(false);
    markWelcomeSeen(1);
    expect(hasSeenWelcome(1)).toBe(true);
    expect(hasSeenWelcome(2)).toBe(false);
  });
});
