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

function renderNav() {
  return render(
    <MemoryRouter initialEntries={["/inicio"]}>
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
    expect(yo.querySelector("img")).toHaveAttribute("src", "/icons/perfil.png");
  });
});
