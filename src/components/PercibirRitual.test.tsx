import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { PercibirRitual } from "./PercibirRitual";
import { ApiError, Species } from "../lib/api";

const species: Species[] = [
  {
    id: 1,
    scientific_name: "Testus dinus",
    common_name: "Test Dino",
    fractae_child_name: "Testa",
    fractae_id: 1,
    fractae_slug: "t",
    fractae_color: null,
  },
];

const discoverResult = {
  discoveryId: 1,
  discoveryCode: "ABC123",
  speciesId: 1,
  scientificName: "Testus dinus",
  commonName: "Test Dino",
  phase: "calma",
  rarityTier: { slug: "registrada", name: "Registrada" },
  imageUrl: "/img.png",
  isUniqueVariant: false,
  discoveredAt: "2026-01-01",
};

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("PercibirRitual", () => {
  it("shows the sealed envelope with instructions when idle", () => {
    render(<PercibirRitual species={species} progress={null} discoverFn={vi.fn()} onUnauthorized={vi.fn()} />);

    expect(screen.getByTestId("envelope-seal")).toBeInTheDocument();
    expect(screen.getByText(/desliza/i)).toBeInTheDocument();
  });

  it("does not call discoverFn when the drag doesn't reach the tear threshold", () => {
    const discoverFn = vi.fn();
    render(<PercibirRitual species={species} progress={null} discoverFn={discoverFn} onUnauthorized={vi.fn()} />);

    const seal = screen.getByTestId("envelope-seal");
    fireEvent.touchStart(seal, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(seal, { touches: [{ clientY: 40 }] });
    fireEvent.touchEnd(seal);

    expect(discoverFn).not.toHaveBeenCalled();
  });

  it("calls discoverFn with the picked species once the drag passes the tear threshold", () => {
    const discoverFn = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<PercibirRitual species={species} progress={null} discoverFn={discoverFn} onUnauthorized={vi.fn()} />);

    const seal = screen.getByTestId("envelope-seal");
    fireEvent.touchStart(seal, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(seal, { touches: [{ clientY: 200 }] });

    expect(discoverFn).toHaveBeenCalledWith({ speciesId: 1, phase: "calma" }, expect.anything());
  });

  it("reveals the card once discoverFn resolves and the ritual animation finishes", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue(discoverResult);
    render(<PercibirRitual species={species} progress={null} discoverFn={discoverFn} onUnauthorized={vi.fn()} />);

    const seal = screen.getByTestId("envelope-seal");
    fireEvent.touchStart(seal, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(seal, { touches: [{ clientY: 200 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("Test Dino")).toBeInTheDocument();
  });

  it("shows an error overlay with retry when discoverFn rejects", async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockRejectedValue(new ApiError(500, "boom"));
    render(<PercibirRitual species={species} progress={null} discoverFn={discoverFn} onUnauthorized={vi.fn()} />);

    const seal = screen.getByTestId("envelope-seal");
    fireEvent.touchStart(seal, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(seal, { touches: [{ clientY: 200 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reintentar"));
    expect(screen.getByTestId("envelope-seal")).toBeInTheDocument();
  });

  it('resets to the sealed envelope when "Percibir de nuevo" is clicked', async () => {
    vi.useFakeTimers();
    const discoverFn = vi.fn().mockResolvedValue(discoverResult);
    render(<PercibirRitual species={species} progress={null} discoverFn={discoverFn} onUnauthorized={vi.fn()} />);

    const seal = screen.getByTestId("envelope-seal");
    fireEvent.touchStart(seal, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(seal, { touches: [{ clientY: 200 }] });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByText("Percibir de nuevo"));

    expect(screen.getByTestId("envelope-seal")).toBeInTheDocument();
  });
});
