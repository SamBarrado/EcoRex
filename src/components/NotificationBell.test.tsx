import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { NotificationsProvider } from "../lib/NotificationsContext";
import { NavVisibilityProvider, useNavVisibility } from "../lib/NavVisibilityContext";
import { AchievementsProvider, useAchievements } from "../lib/AchievementsContext";

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
const fusionReady = (id: number) => ({ id, type: "fusion_ready", payload: { speciesId: 2, commonName: "Hustor" }, readAt: null, createdAt: "" });

function HideNav() {
  const { hideNav, showNav } = useNavVisibility();
  return (
    <>
      <button onClick={hideNav}>hide-nav</button>
      <button onClick={showNav}>show-nav</button>
    </>
  );
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

  async function hiddenBellReceives(...batches: ReturnType<typeof energy | typeof fusionReady | typeof levelUp>[][]) {
    getNotificationsMock.mockResolvedValue({ notifications: [] });
    renderBell();
    await flush();
    fireEvent.click(screen.getByText("hide-nav"));
    for (const notifications of batches) {
      getNotificationsMock.mockResolvedValue({ notifications });
      await comeBackToApp();
    }
  }

  async function showBell() {
    fireEvent.click(screen.getByText("show-nav"));
    await flush();
  }

  it("keeps a notification that arrives while hidden and announces it when the bell returns", async () => {
    await hiddenBellReceives([fusionReady(3)]);
    expect(screen.queryByRole("status")).toBeNull();

    await showBell();
    expect(screen.getByRole("status").textContent).toContain("¡Ya puedes fusionar Hustor!");
  });

  it("does not let a ring-only notification of the same batch swallow the one with a banner", async () => {
    getNotificationsMock.mockResolvedValue({ notifications: [] });
    renderBell();
    await flush();
    getNotificationsMock.mockResolvedValue({ notifications: [levelUp(4), fusionReady(3)] });
    await comeBackToApp();
    expect(screen.getByRole("status").textContent).toContain("¡Ya puedes fusionar Hustor!");
  });

  it("does not let a later ring-only notification replace the pending banner", async () => {
    await hiddenBellReceives([fusionReady(3)], [levelUp(4), fusionReady(3)]);
    await showBell();
    expect(screen.getByRole("status").textContent).toContain("¡Ya puedes fusionar Hustor!");
  });

  it("drops a pending notification that stopped being unread while hidden", async () => {
    await hiddenBellReceives([fusionReady(3)], []);
    await showBell();
    expect(screen.queryByRole("status")).toBeNull();
  });

  describe("behind full-screen moments and achievement banners", () => {
    let announce: ReturnType<typeof useAchievements>["announce"];
    function Grab() {
      announce = useAchievements().announce;
      return null;
    }

    const wait = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    async function renderWithAchievements() {
      getNotificationsMock.mockResolvedValue({ notifications: [] });
      render(
        <MemoryRouter initialEntries={["/inicio"]}>
          <NavVisibilityProvider>
            <NotificationsProvider>
              <AchievementsProvider>
                <NotificationBell />
                <Grab />
              </AchievementsProvider>
            </NotificationsProvider>
          </NavVisibilityProvider>
        </MemoryRouter>,
      );
      await flush();
    }

    const achievement = (kind: "medal" | "banner") => ({ id: kind, kind, icon: "✅", title: `Logro ${kind}`, subtitle: "sub", color: "#3fae5a" });
    const bellBanner = () => screen.queryByText("¡Ya puedes fusionar Hustor!", { selector: ".notif-banner span" });
    async function notificationArrives() {
      getNotificationsMock.mockResolvedValue({ notifications: [fusionReady(3)] });
      await comeBackToApp();
    }

    it("waits for the medal and for the achievement banners before sliding in", async () => {
      await renderWithAchievements();
      act(() => {
        void announce([achievement("medal"), achievement("banner")]);
      });
      await notificationArrives();
      await wait(10_000);
      expect(bellBanner()).toBeNull();

      fireEvent.click(screen.getByRole("dialog", { name: "Logro medal" }));
      await wait(1000);
      expect(screen.getByText("Logro banner")).toBeTruthy();
      expect(bellBanner()).toBeNull();

      await wait(3200); // the achievement banner is gone
      expect(bellBanner()).not.toBeNull();
    });

    it("comes back for its whole time when something covered it halfway", async () => {
      await renderWithAchievements();
      await notificationArrives();
      await wait(1000);
      act(() => {
        void announce([achievement("medal")]);
      });
      await wait(10_000);
      expect(bellBanner()).toBeNull();

      fireEvent.click(screen.getByRole("dialog", { name: "Logro medal" }));
      await wait(2000);
      expect(bellBanner()).not.toBeNull();
      await wait(400);
      expect(bellBanner()).toBeNull();
    });
  });
});
