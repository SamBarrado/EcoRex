import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import DesktopNotice, { DESKTOP_NOTICE_KEY, DESKTOP_QUERY } from "./DesktopNotice";

function mockMatch(matches: boolean) {
  const queries: string[] = [];
  window.matchMedia = ((q: string) => {
    queries.push(q);
    return { matches, media: q, addEventListener: () => {}, removeEventListener: () => {} };
  }) as unknown as typeof window.matchMedia;
  return queries;
}

describe("DesktopNotice", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("no se muestra en móvil/táctil", () => {
    mockMatch(false);
    render(<DesktopNotice />);
    expect(screen.queryByLabelText("Aviso de uso en móvil")).toBeNull();
  });

  it("se muestra en escritorio con el QR y usa la consulta de puntero + ancho", () => {
    const q = mockMatch(true);
    render(<DesktopNotice />);
    expect(screen.getByLabelText("Aviso de uso en móvil")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("src")).toBe("/qr-ecorex.svg");
    expect(q).toContain(DESKTOP_QUERY);
  });

  it("se oculta y lo recuerda", () => {
    mockMatch(true);
    render(<DesktopNotice />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar aquí" }));
    expect(screen.queryByLabelText("Aviso de uso en móvil")).toBeNull();
    expect(localStorage.getItem(DESKTOP_NOTICE_KEY)).toBe("1");
    cleanup();
    render(<DesktopNotice />);
    expect(screen.queryByLabelText("Aviso de uso en móvil")).toBeNull();
  });

  it("no rompe sin matchMedia", () => {
    // @ts-expect-error simulamos un entorno sin matchMedia
    window.matchMedia = undefined;
    render(<DesktopNotice />);
    expect(screen.queryByLabelText("Aviso de uso en móvil")).toBeNull();
  });
});
