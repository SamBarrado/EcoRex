import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PerfilPage from "./PerfilPage";
import { AvatarProvider } from "../lib/AvatarContext";
import type { ProfileStats } from "../lib/api";
import * as onboardingContext from "../lib/OnboardingContext";
import * as push from "../lib/push";

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
  registeredCount: 4,
  registeredTotalCount: 30,
  repeatedCount: 2,
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
  vi.restoreAllMocks();
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

describe("PerfilPage collection stats", () => {
  it("shows species and EcoDex registries as two labelled rings, plus cards and repeated cards", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    renderPage();

    expect(await screen.findByRole("img", { name: "Especies descubiertas 3 de 10" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Registros del EcoDex 4 de 30" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Cartas conseguidas 5" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Cartas repetidas 2" })).toBeInTheDocument();
    // Retired labels that mixed units.
    expect(screen.queryByText("Duplicados")).not.toBeInTheDocument();
    expect(screen.queryByText("Capturas totales")).not.toBeInTheDocument();
    expect(screen.queryByText("Progreso de colección")).not.toBeInTheDocument();
  });

  it("fills each ring in proportion to what is collected", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    renderPage();
    const species = await screen.findByRole("img", { name: "Especies descubiertas 3 de 10" });
    expect((species.querySelector(".f") as SVGElement).style.strokeDasharray).toBe("30 100");
    const registries = screen.getByRole("img", { name: "Registros del EcoDex 4 de 30" });
    expect((registries.querySelector(".f") as SVGElement).style.strokeDasharray).toBe("13 100");
  });

  it("shows the level, title and XP bar in the hero", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    renderPage();
    expect(await screen.findByText("Nivel 2 · Explorador")).toBeInTheDocument();
    expect(screen.getByText("10/40 XP")).toBeInTheDocument();
    expect((document.querySelector(".level-progress-fill") as HTMLElement).style.width).toBe("25%");
  });

  it("draws the rarity as a stacked bar with a legend, weakest first, with the card colours", async () => {
    getMyProfileMock.mockResolvedValue({
      ...baseProfile,
      rarityBreakdown: [
        { slug: "epica", name: "Especie Épica", count: 1 },
        { slug: "registrada", name: "Especie Registrada", count: 14 },
        { slug: "notable", name: "Especie Notable", count: 6 },
      ],
    });
    renderPage();
    const bar = await screen.findByRole("img", { name: "Registrada 14, Notable 6, Épica 1" });
    const segments = Array.from(bar.querySelectorAll("i")) as HTMLElement[];
    expect(segments.map((s) => s.style.flexGrow)).toEqual(["14", "6", "1"]);
    expect(segments[1].style.background).toBe("rgb(79, 169, 224)"); // notable blue
    expect(screen.getByText("Notable")).toBeInTheDocument();
  });

  it("hides the rarity card when nothing was found yet", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    renderPage();
    await screen.findByText("Nivel 2 · Explorador");
    expect(screen.queryByText("Por rareza")).not.toBeInTheDocument();
  });
});

describe("PerfilPage logout", () => {
  it("is a primary (filled) button like \"Activar\", not the outlined secondary one", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    renderPage();
    const logoutButton = await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(logoutButton.className).toBe("");
    expect(logoutButton.parentElement).toHaveClass("btn-row");
  });
});

describe("PerfilPage and Primeros pasos", () => {
  it("checks the prize right after the energy alerts are switched on", async () => {
    getMyProfileMock.mockResolvedValue(baseProfile);
    const check = vi.fn().mockResolvedValue(null);
    vi.spyOn(onboardingContext, "useOnboarding").mockReturnValue({ check, paid: 0 });
    vi.spyOn(push, "isPushSupported").mockReturnValue(true);
    vi.spyOn(push, "getNotificationPermission").mockReturnValue("default");
    vi.spyOn(push, "hasActivePushSubscription").mockResolvedValueOnce(false).mockResolvedValue(true);
    vi.spyOn(push, "subscribeToPush").mockResolvedValue(undefined);

    renderPage();
    fireEvent.click(await screen.findByRole("switch"));
    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
  });
});

