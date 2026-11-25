import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RegisterPage from "./RegisterPage";

const registerMock = vi.fn();
const setAvatarMock = vi.fn();

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    register: (...a: unknown[]) => registerMock(...a),
    setAvatar: (...a: unknown[]) => setAvatarMock(...a),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/registro"]}>
      <Routes>
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/inicio" element={<div>Pantalla de inicio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fill() {
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@a.com" } });
  fireEvent.change(screen.getByPlaceholderText("Nombre de usuario"), { target: { value: "Sam_1" } });
  fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "12345678" } });
}

describe("RegisterPage (explorer card)", () => {
  it("fills the card live with the username and the picked avatar", () => {
    renderPage();
    expect(screen.getByText("Tu nombre")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Nombre de usuario"), { target: { value: "Sam_1" } });
    expect(document.querySelector(".id-card-name")?.textContent).toBe("Sam_1");
    expect(document.querySelector(".id-card-photo img")?.getAttribute("src")).toBe("/avatars/avatar-1.webp");

    fireEvent.click(screen.getByRole("radio", { name: "Avatar 3" }));
    expect(document.querySelector(".id-card-photo img")?.getAttribute("src")).toBe("/avatars/avatar-3.webp");
    expect(screen.getByRole("radio", { name: "Avatar 3" }).getAttribute("aria-checked")).toBe("true");
  });

  it("sets the chosen avatar right after registering, then goes to Inicio", async () => {
    registerMock.mockResolvedValue({});
    setAvatarMock.mockResolvedValue({ avatar: "avatar-2" });
    renderPage();
    fill();
    fireEvent.click(screen.getByRole("radio", { name: "Avatar 2" }));
    fireEvent.click(screen.getByText("Crear mi carnet"));

    expect(await screen.findByText("Pantalla de inicio")).toBeTruthy();
    expect(registerMock).toHaveBeenCalledWith({ email: "a@a.com", password: "12345678", display_name: "Sam_1" });
    expect(setAvatarMock).toHaveBeenCalledWith("avatar-2");
  });

  it("still signs the player up when setting the avatar fails", async () => {
    registerMock.mockResolvedValue({});
    setAvatarMock.mockRejectedValue(new Error("boom"));
    renderPage();
    fill();
    fireEvent.click(screen.getByText("Crear mi carnet"));
    expect(await screen.findByText("Pantalla de inicio")).toBeTruthy();
  });

  it("does not set an avatar when registering fails", async () => {
    const { ApiError } = await import("../lib/api");
    registerMock.mockRejectedValue(new ApiError(409, "Email ya registrado"));
    renderPage();
    fill();
    fireEvent.click(screen.getByText("Crear mi carnet"));
    await waitFor(() => expect(screen.getByText("Email ya registrado")).toBeTruthy());
    expect(setAvatarMock).not.toHaveBeenCalled();
  });
});
