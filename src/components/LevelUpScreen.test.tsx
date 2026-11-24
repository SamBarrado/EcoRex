import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LevelUpScreen } from "./LevelUpScreen";

afterEach(cleanup);

describe("LevelUpScreen", () => {
  it("announces the energy gained on level-up", () => {
    render(<LevelUpScreen previousLevel={4} level={5} energyGained={1} onClose={() => {}} />);
    expect(screen.getByText("⚡ +1 de energía")).toBeTruthy();
  });

  it("does not mention energy when none was gained", () => {
    render(<LevelUpScreen previousLevel={4} level={5} onClose={() => {}} />);
    expect(screen.queryByText(/de energía/)).toBeNull();
  });
});
