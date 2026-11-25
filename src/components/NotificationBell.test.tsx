import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { NotificationsProvider } from "../lib/NotificationsContext";
import { NavVisibilityProvider, useNavVisibility } from "../lib/NavVisibilityContext";

const getNotificationsMock = vi.fn();
const markReadMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getNotifications: (...a: unknown[]) => getNotificationsMock(...a),
    markNotificationRead: (...a: unknown[]) => markReadMock(...a),
  };
});

const energy = (id: number) => ({ id, type: "energy_available", payload: { remaining: 3, max: 3 }, readAt: null, createdAt: "" });
const levelUp = (id: number) => ({ id, type: "level_up", payload: { newLevel: 5 }, readAt: null, createdAt: "" });

function HideNav() {
  const { hideNav } = useNavVisibility();
  return <button onClick={hideNav}>hide-nav</button>;
}

function renderBell(path = "/inicio") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavVisibilityProvider>
        <NotificationsProvider>
          <NotificationBell />
          <HideNav />
        </NotificationsProvider>
      </NavVisibilityProvider>
    </MemoryRouter>,
  );
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function comeBackToApp() {
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: true })); // reduced motion: banner folds without WAAPI
  markReadMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("NotificationBell", () => {
  it("shows the unread count in the header bell", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [energy(1), energy(2)] });
    renderBell();
    await flush();
    expect(screen.getByRole("button", { name: /Notificaciones \(2 sin leer\)/ })).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("does not announce what was already waiting when the app opened", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [energy(1)] });
    renderBell();
    await flush();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("slides in a banner for a notification that arrives later, then folds into the bell", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [] });
    renderBell();
    await flush();
    getNotificationsMock.mockResolvedValue({ notifications: [energy(7)] });
    await comeBackToApp();
    expect(screen.getByRole("status").textContent).toContain("Tienes 3/3 energía");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2400);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.querySelector(".notif-bell-ring")).not.toBeNull();
  });

  it("only rings for notifications that already have their own moment (level-up)", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [] });
    renderBell();
    await flush();
    getNotificationsMock.mockResolvedValue({ notifications: [levelUp(9)] });
    await comeBackToApp();
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.querySelector(".notif-bell-ring")).not.toBeNull();
  });

  it("opens the list and marks a notification read when it is tapped", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [energy(1)] });
    renderBell();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    fireEvent.click(screen.getByText("Tienes 3/3 energía — ya puedes percibir."));
    await flush();
    expect(markReadMock).toHaveBeenCalledWith(1);
  });

  it("is not shown in Percibir, on account screens or while the nav is hidden", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [energy(1)] });
    renderBell("/percibir");
    await flush();
    expect(screen.queryByRole("button", { name: /Notificaciones/ })).toBeNull();
    cleanup();

    renderBell("/login");
    await flush();
    expect(screen.queryByRole("button", { name: /Notificaciones/ })).toBeNull();
    cleanup();

    renderBell("/inicio");
    await flush();
    expect(screen.getByRole("button", { name: /Notificaciones/ })).toBeTruthy();
    fireEvent.click(screen.getByText("hide-nav"));
    expect(screen.queryByRole("button", { name: /Notificaciones/ })).toBeNull();
  });
});
