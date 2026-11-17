import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacidadPage from "./PrivacidadPage";

afterEach(cleanup);

describe("PrivacidadPage", () => {
  it("renders the policy and links back to login without needing a session", () => {
    render(
      <MemoryRouter>
        <PrivacidadPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Política de privacidad" })).toBeTruthy();
    expect(screen.getByText(/Política de Datos del Usuario/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a iniciar sesión" }).getAttribute("href")).toBe("/login");
  });
});
