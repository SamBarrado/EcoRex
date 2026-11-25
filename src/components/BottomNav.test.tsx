import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "./BottomNav";
import { AvatarProvider } from "../lib/AvatarContext";
import { NavVisibilityProvider } from "../lib/NavVisibilityContext";
import { PlayerProvider } from "../lib/PlayerContext";

const getMyProfileMock = vi.fn();
const getEnergyMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
    getEnergy: (...args: unknown[]) => getEnergyMock(...args),
    getDex: () => Promise.resolve({ currentWave: 1, slots: [] }),
  };
});

vi.mock("../lib/useNavBadges", () => ({
  useNavBadges: () => ({ inicioCount: 0, percibirActive: false, ecodexActive: false, ecodexNewestSlotKey: null }),
}));

function renderNav(path = "/inicio") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavVisibilityProvider>
        <PlayerProvider>
          <AvatarProvider>
            <BottomNav />
          </AvatarProvider>
        </PlayerProvider>
      </NavVisibilityProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  getEnergyMock.mockResolvedValue({ remaining: 0, max: 5, unlimited: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BottomNav avatar", () => {
  it("shows the chosen avatar above 'Yo'", async () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: "avatar-2" } });
    renderNav();
    const yo = screen.getByText("Yo").closest("button")!;
    await waitFor(() => expect(yo.querySelector("img")).toHaveAttribute("src", "/avatars/avatar-2.webp"));
  });

  it("keeps the default 'Yo' icon when no avatar is chosen", async () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    renderNav();
    await waitFor(() => expect(getMyProfileMock).toHaveBeenCalled());
    const yo = screen.getByText("Yo").closest("button")!;
    // No picture: the same line-style icon as the other tabs (a person), not an illustrated one.
    expect(yo.querySelector("img")).toBeNull();
    expect(yo.querySelector("svg")).not.toBeNull();
  });
});

describe("BottomNav sliding pill", () => {
  it.each([
    ["/inicio", "0"],
    ["/percibir", "1"],
    ["/coleccion", "2"],
    ["/perfil", "3"],
  ])("sits under the active tab on %s", (path, index) => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    renderNav(path);
    expect(screen.getByRole("navigation").style.getPropertyValue("--nav-i")).toBe(index);
    expect(screen.getByTestId("nav-pill")).not.toHaveClass("bottom-nav-pill-off");
  });

  it("fades out on screens that are not tabs", () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    renderNav("/fusion");
    expect(screen.getByTestId("nav-pill")).toHaveClass("bottom-nav-pill-off");
  });

  it("marks only the current tab as the current page", () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    renderNav("/coleccion");
    expect(screen.getByText("EcoDex").closest("button")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Inicio").closest("button")).not.toHaveAttribute("aria-current");
  });
});

describe("BottomNav icons and energy ring", () => {
  it("uses line icons for the four tabs: no illustrated images, only the avatar is a picture", async () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: "avatar-1" } });
    renderNav();
    await waitFor(() => expect(screen.getByText("Yo").closest("button")!.querySelector("img")).not.toBeNull());
    for (const label of ["Inicio", "Percibir", "EcoDex"]) {
      const btn = screen.getByText(label).closest("button")!;
      expect(btn.querySelector("img")).toBeNull();
      expect(btn.querySelector("svg")).not.toBeNull();
    }
  });

  it("draws the energy left as a ring around Percibir and announces it", async () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    getEnergyMock.mockResolvedValue({ remaining: 2, max: 4, resetAt: null, unlimited: false });
    renderNav();
    const percibir = screen.getByText("Percibir").closest("button")!;
    await waitFor(() => expect(percibir.querySelector(".f")).toHaveStyle({ strokeDasharray: "50 100" }));
    expect(percibir).toHaveTextContent("energía 2 de 4");
    expect(percibir).not.toHaveClass("bottom-nav-tab-empty");
    expect(percibir).not.toHaveClass("bottom-nav-tab-full");
  });

  it("pulses with full energy and dims with none", async () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    getEnergyMock.mockResolvedValue({ remaining: 3, max: 3, resetAt: null, unlimited: false });
    renderNav();
    await waitFor(() => expect(screen.getByText("Percibir").closest("button")).toHaveClass("bottom-nav-tab-full"));
    cleanup();

    getEnergyMock.mockResolvedValue({ remaining: 0, max: 3, resetAt: 1, unlimited: false });
    renderNav();
    await waitFor(() => expect(screen.getByText("Percibir").closest("button")).toHaveClass("bottom-nav-tab-empty"));
  });

  it("with unlimited energy the ring stays full and nothing is announced", async () => {
    getMyProfileMock.mockResolvedValue({ user: { avatar: null } });
    getEnergyMock.mockResolvedValue({ remaining: 0, max: 3, resetAt: null, unlimited: true });
    renderNav();
    const percibir = screen.getByText("Percibir").closest("button")!;
    await waitFor(() => expect(percibir).toHaveClass("bottom-nav-tab-full"));
    expect(percibir).not.toHaveTextContent("energía");
  });
});
