import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import UsernameSetupPage from "./UsernameSetupPage";

const setUsernameMock = vi.fn();
const setAvatarMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    setUsername: (...a: unknown[]) => setUsernameMock(...a),
    setAvatar: (...a: unknown[]) => setAvatarMock(...a),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/elegir-usuario"]}>
      <Routes>
        <Route path="/elegir-usuario" element={<UsernameSetupPage />} />
        <Route path="/inicio" element={<div>Pantalla de inicio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UsernameSetupPage (explorer card for Google accounts)", () => {
  it("shows the card and fills it live", () => {
    renderPage();
    expect(screen.getByText("Tu nombre")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Nombre de usuario"), { target: { value: "Sam_1" } });
    expect(document.querySelector(".id-card-name")?.textContent).toBe("Sam_1");
    fireEvent.click(screen.getByRole("radio", { name: "Avatar 3" }));
    expect(document.querySelector(".id-card-photo img")?.getAttribute("src")).toBe("/avatars/avatar-3.webp");
  });

  it("saves the username and the chosen avatar, then goes to Inicio", async () => {
    setUsernameMock.mockResolvedValue({});
    setAvatarMock.mockResolvedValue({ avatar: "avatar-2" });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Nombre de usuario"), { target: { value: "Sam_1" } });
    fireEvent.click(screen.getByRole("radio", { name: "Avatar 2" }));
    fireEvent.click(screen.getByText("Crear mi carnet"));
    await waitFor(() => expect(screen.getByText("Pantalla de inicio")).toBeTruthy());
    expect(setUsernameMock).toHaveBeenCalledWith({ display_name: "Sam_1" });
    expect(setAvatarMock).toHaveBeenCalledWith("avatar-2");
  });

  it("still continues if saving the avatar fails", async () => {
    setUsernameMock.mockResolvedValue({});
    setAvatarMock.mockRejectedValue(new Error("x"));
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Nombre de usuario"), { target: { value: "Sam_1" } });
    fireEvent.click(screen.getByText("Crear mi carnet"));
    await waitFor(() => expect(screen.getByText("Pantalla de inicio")).toBeTruthy());
  });
});
