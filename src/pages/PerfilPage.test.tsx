import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PerfilPage from "./PerfilPage";
import { AvatarProvider } from "../lib/AvatarContext";
import type { ProfileStats } from "../lib/api";

const getMyProfileMock = vi.fn();
const setAvatarMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
    setAvatar: (...args: unknown[]) => setAvatarMock(...args),
  };
});

const baseProfile: ProfileStats = {
  user: { id: 1, email: "a@a.com", display_name: "Sam", avatar: null },
  xp: 50,
  level: 2,
  xpIntoLevel: 10,
  xpForNextLevel: 40,
  title: "Explorador",
  speciesDiscoveredCount: 3,
  speciesTotalCount: 10,
  totalDiscoveries: 5,
  duplicateCount: 2,
  rarityBreakdown: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AvatarProvider>
        <PerfilPage />
      </AvatarProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PerfilPage avatar", () => {
  it("shows the username initial when no avatar is chosen", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    renderPage();
    const avatar = await screen.findByLabelText("Cambiar avatar");
    expect(avatar).toHaveTextContent("S");
    expect(avatar.querySelector("img")).toBeNull();
  });

  it("shows the saved default avatar image", async () => {
    getMyProfileMock.mockResolvedValue({ ...baseProfile, user: { ...baseProfile.user, avatar: "avatar-3" } });
    renderPage();
    const avatar = await screen.findByLabelText("Cambiar avatar");
    expect(avatar.querySelector("img")).toHaveAttribute("src", "/avatars/avatar-3.webp");
  });

  it("lets the user pick an avatar and saves it", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    setAvatarMock.mockResolvedValue({ avatar: "avatar-2" });
    renderPage();
    fireEvent.click(await screen.findByLabelText("Cambiar avatar"));
    fireEvent.click(screen.getByLabelText("Avatar 2"));
    await waitFor(() => expect(setAvatarMock).toHaveBeenCalledWith("avatar-2"));
    await waitFor(() => {
      expect(screen.getByLabelText("Cambiar avatar").querySelector("img")).toHaveAttribute("src", "/avatars/avatar-2.webp");
    });
    expect(screen.queryByText("Elige tu avatar")).not.toBeInTheDocument();
  });

  it("goes back to the initial with null", async () => {
    getMyProfileMock.mockResolvedValue({ ...baseProfile, user: { ...baseProfile.user, avatar: "avatar-1" } });
    setAvatarMock.mockResolvedValue({ avatar: null });
    renderPage();
    fireEvent.click(await screen.findByLabelText("Cambiar avatar"));
    fireEvent.click(screen.getByLabelText("Usar mi inicial"));
    await waitFor(() => expect(setAvatarMock).toHaveBeenCalledWith(null));
    await waitFor(() => expect(screen.getByLabelText("Cambiar avatar")).toHaveTextContent("S"));
  });

  it("shows an error and keeps the picker open when saving fails", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    setAvatarMock.mockRejectedValue(new Error("boom"));
    renderPage();
    fireEvent.click(await screen.findByLabelText("Cambiar avatar"));
    fireEvent.click(screen.getByLabelText("Avatar 1"));
    expect(await screen.findByText(/No se pudo guardar el avatar/)).toBeInTheDocument();
    expect(screen.getByText("Elige tu avatar")).toBeInTheDocument();
  });
});
