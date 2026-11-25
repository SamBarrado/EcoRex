import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingChecklist } from "./OnboardingChecklist";
import type { OnboardingState } from "../lib/api";

const subscribeMock = vi.fn();
let supported = true;
let permission: NotificationPermission = "granted";

vi.mock("../lib/push", () => ({
  isPushSupported: () => supported,
  getNotificationPermission: () => permission,
  subscribeToPush: (...a: unknown[]) => subscribeMock(...a),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  supported = true;
  permission = "granted";
});

const state: OnboardingState = {
  eligible: true,
  rewardClaimed: false,
  steps: [
    { slug: "account", done: true },
    { slug: "pack", done: true },
    { slug: "ecodex", done: false },
    { slug: "push", done: false },
    { slug: "mission", done: true },
  ],
};

describe("OnboardingChecklist", () => {
  it("'Ir' to the EcoDex navigates", () => {
    const onGo = vi.fn();
    render(<OnboardingChecklist state={state} onGo={onGo} />);
    fireEvent.click(screen.getByText("Ir"));
    expect(onGo).toHaveBeenCalledWith("/coleccion");
  });

  it("'Activar' subscribes in place and asks to reload the state", async () => {
    subscribeMock.mockResolvedValue(undefined);
    const onGo = vi.fn();
    const onChanged = vi.fn();
    render(<OnboardingChecklist state={state} onGo={onGo} onChanged={onChanged} />);
    fireEvent.click(screen.getByText("Activar"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(onGo).not.toHaveBeenCalled();
  });

  it("falls back to Perfil when the permission is refused or push is unsupported", async () => {
    subscribeMock.mockResolvedValue(undefined);
    permission = "denied";
    const onGo = vi.fn();
    const onChanged = vi.fn();
    render(<OnboardingChecklist state={state} onGo={onGo} onChanged={onChanged} />);
    fireEvent.click(screen.getByText("Activar"));
    await waitFor(() => expect(onGo).toHaveBeenCalledWith("/perfil"));
    expect(onChanged).not.toHaveBeenCalled();

    cleanup();
    supported = false;
    const onGo2 = vi.fn();
    render(<OnboardingChecklist state={state} onGo={onGo2} />);
    fireEvent.click(screen.getByText("Activar"));
    expect(onGo2).toHaveBeenCalledWith("/perfil");
  });
});
