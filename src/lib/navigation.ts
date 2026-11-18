import { useCallback } from "react";
import { NavigateOptions, useLocation, useNavigate } from "react-router-dom";

// Directional slide between screens (design chosen 2026-11-18, "deslizamiento
// direccional"). The motion itself is CSS (`src/transitions.css`) on the
// browser's View Transitions API; this module only decides the direction and
// opts a navigation into the transition when the browser can do it.

export const TAB_ORDER = ["/inicio", "/percibir", "/coleccion", "/perfil"] as const;

export type NavDirection = "forward" | "back" | "none";

// Screens that are not tabs (e.g. /fusion) live "deeper" than every tab, so
// opening one slides forward and coming back to a tab slides back.
const DEEP_RANK = TAB_ORDER.length + 1;

function rank(path: string): number {
  const i = TAB_ORDER.findIndex((p) => path === p);
  return i === -1 ? DEEP_RANK : i;
}

export function navDirection(from: string, to: string): NavDirection {
  const a = rank(from);
  const b = rank(to);
  if (a === b) return "none";
  return b > a ? "forward" : "back";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function";
}

/** `navigate` that slides between screens when the browser supports it. */
export function useAppNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (to: string, options?: NavigateOptions) => {
      const direction = navDirection(location.pathname, to);
      const animate = direction !== "none" && supportsViewTransitions() && !prefersReducedMotion();
      if (animate) document.documentElement.dataset.vtDir = direction;
      navigate(to, { ...options, viewTransition: animate });
    },
    [navigate, location.pathname]
  );
}
