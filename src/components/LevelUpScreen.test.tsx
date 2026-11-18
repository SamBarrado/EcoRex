import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LevelUpScreen } from "./LevelUpScreen";

afterEach(cleanup);

describe("LevelUpScreen", () => {
  it("announces the energy refill when the level-up topped it up", () => {
    render(<LevelUpScreen previousLevel={4} level={5} energyRefilled onClose={() => {}} />);
    expect(screen.getByText("⚡ ¡Energía recargada!")).toBeTruthy();
  });

  it("does not mention energy when it was not refilled", () => {
    render(<LevelUpScreen previousLevel={4} level={5} onClose={() => {}} />);
    expect(screen.queryByText(/Energía recargada/)).toBeNull();
  });
});
