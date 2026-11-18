import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { navDirection, useAppNavigate } from "./navigation";

describe("navDirection", () => {
  it("slides forward along the tab order and back against it", () => {
    expect(navDirection("/inicio", "/percibir")).toBe("forward");
    expect(navDirection("/inicio", "/perfil")).toBe("forward");
    expect(navDirection("/perfil", "/coleccion")).toBe("back");
    expect(navDirection("/percibir", "/inicio")).toBe("back");
  });

  it("does nothing when the screen does not change", () => {
    expect(navDirection("/coleccion", "/coleccion")).toBe("none");
  });

  it("treats non-tab screens as deeper than every tab", () => {
    expect(navDirection("/inicio", "/fusion")).toBe("forward");
    expect(navDirection("/perfil", "/fusion")).toBe("forward");
    expect(navDirection("/fusion", "/inicio")).toBe("back");
    expect(navDirection("/fusion", "/perfil")).toBe("back");
  });
});

function Probe({ to }: { to: string }) {
  const navigate = useAppNavigate();
  const location = useLocation();
  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <button onClick={() => navigate(to)}>go</button>
    </div>
  );
}

function setup(to: string) {
  return render(
    <MemoryRouter initialEntries={["/inicio"]}>
      <Probe to={to} />
    </MemoryRouter>
  );
}

describe("useAppNavigate", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.vtDir;
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it("navigates normally when the browser has no View Transitions (no direction flag)", () => {
    setup("/percibir");
    act(() => screen.getByText("go").click());
    expect(screen.getByTestId("path")).toHaveTextContent("/percibir");
    expect(document.documentElement.dataset.vtDir).toBeUndefined();
  });

  it("flags the direction on <html> when the browser supports View Transitions", () => {
    (document as unknown as { startViewTransition: (cb: () => void) => unknown }).startViewTransition = (cb) => {
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    };
    setup("/perfil");
    act(() => screen.getByText("go").click());
    expect(screen.getByTestId("path")).toHaveTextContent("/perfil");
    expect(document.documentElement.dataset.vtDir).toBe("forward");
  });

  it("skips the animation (but still navigates) with prefers-reduced-motion", () => {
    (document as unknown as { startViewTransition: (cb: () => void) => unknown }).startViewTransition = (cb) => {
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    };
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    setup("/percibir");
    act(() => screen.getByText("go").click());
    expect(screen.getByTestId("path")).toHaveTextContent("/percibir");
    expect(document.documentElement.dataset.vtDir).toBeUndefined();
  });
});
