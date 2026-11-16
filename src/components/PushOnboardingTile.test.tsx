import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PushOnboardingTile from "./PushOnboardingTile";

vi.mock("../lib/push", () => ({
  isPushSupported: () => true,
  getNotificationPermission: () => "default",
}));

function renderTile() {
  return render(
    <MemoryRouter>
      <PushOnboardingTile />
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("PushOnboardingTile", () => {
  it("shows while the user has not chosen anything", () => {
    renderTile();
    expect(screen.getByText("Activa las notificaciones")).toBeInTheDocument();
  });

  it("stays hidden after 'Ahora no' even when the page is visited again", () => {
    const first = renderTile();
    fireEvent.click(screen.getByText("Ahora no"));
    expect(screen.queryByText("Activa las notificaciones")).toBeNull();
    first.unmount();

    renderTile();
    expect(screen.queryByText("Activa las notificaciones")).toBeNull();
  });

  it("stays hidden after 'Activar' even if permission is still default on return", () => {
    const first = renderTile();
    fireEvent.click(screen.getByText("Activar"));
    first.unmount();

    renderTile();
    expect(screen.queryByText("Activa las notificaciones")).toBeNull();
  });
});
