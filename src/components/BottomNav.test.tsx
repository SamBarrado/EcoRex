import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "./BottomNav";
import { AvatarProvider } from "../lib/AvatarContext";
import { NavVisibilityProvider } from "../lib/NavVisibilityContext";

const getMyProfileMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
    getEnergy: () => Promise.resolve({ remaining: 0, max: 5, unlimited: false }),
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
        <AvatarProvider>
          <BottomNav />
        </AvatarProvider>
      </NavVisibilityProvider>
    </MemoryRouter>
  );
}

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
    expect(yo.querySelector("img")).toHaveAttribute("src", "/icons/perfil.webp");
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
