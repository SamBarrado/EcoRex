// XP orbs: glowing dots that leave the centre of the screen and fly to the level ring
// (`[data-level-hud]`). Pure Web Animations API, no library. The ring can be
// hidden (immersive moments hide it with the bottom nav); then the orbs aim at
// the spot where it sits, and the ring's own gain flash covers the arrival
// once it comes back.

const MIN_ORBS = 3;
const MAX_ORBS = 10;
const XP_PER_ORB = 5;
const START_DELAY_MS = 350;
const STAGGER_MS = 70;
const FLIGHT_MS = 900;

export function orbCountFor(xp: number): number {
  return Math.max(MIN_ORBS, Math.min(MAX_ORBS, Math.ceil(xp / XP_PER_ORB)));
}

/** When the orbs of a flight arrive, counted from its launch. */
export interface XpFlight {
  firstLandingMs: number;
  lastLandingMs: number;
}

const flightListeners = new Set<(flight: XpFlight) => void>();

/** The level ring listens here to show up and fill in step with the orbs. */
export function onXpFlight(listener: (flight: XpFlight) => void): () => void {
  flightListeners.add(listener);
  return () => {
    flightListeners.delete(listener);
  };
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Where the orbs land: the level ring if it is on screen, else its usual corner. */
function targetPoint(): { x: number; y: number; ring: HTMLElement | null } {
  const ring = document.querySelector<HTMLElement>("[data-level-hud]");
  if (ring) {
    const r = ring.getBoundingClientRect();
    if (r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2, ring };
  }
  const column = Math.min(window.innerWidth, 480);
  const right = (window.innerWidth - column) / 2 + 12 + 22;
  return { x: window.innerWidth - right, y: 10 + 22, ring: null };
}

/**
 * Launches the orbs; their layer removes itself once the last one lands, so the
 * flight survives the screen that launched it. Returns a cleanup that cancels
 * whatever is still in flight. Does nothing under reduced motion or where WAAPI
 * is missing.
 */
export function flyOrbs({ amount }: { amount: number }): () => void {
  const count = orbCountFor(amount);
  // Announced even when nothing is animated: the ring still shows the XP arriving.
  const firstLandingMs = START_DELAY_MS + FLIGHT_MS;
  flightListeners.forEach((listener) => listener({ firstLandingMs, lastLandingMs: firstLandingMs + (count - 1) * STAGGER_MS }));

  if (prefersReducedMotion() || typeof document.body.animate !== "function") return () => {};

  const layer = document.createElement("div");
  layer.className = "xp-orb-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const ox = window.innerWidth / 2;
  const oy = window.innerHeight / 2;
  let landed = 0;
  const animations: Animation[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (let i = 0; i < count; i++) {
    timers.push(
      setTimeout(() => {
        const target = targetPoint();
        const orb = document.createElement("span");
        orb.className = "xp-orb";
        layer.appendChild(orb);

        // Fan out sideways first so the orbs read as a stream, not a line.
        const spread = (i % 2 === 0 ? 1 : -1) * (14 + (i % 4) * 9);
        const midX = (ox + target.x) / 2 + spread;
        const midY = Math.min(oy, target.y) + (Math.abs(oy - target.y) * 0.35);
        const pos = (x: number, y: number, scale: number, opacity: number) =>
          ({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`, opacity }) as Keyframe;

        const flight = orb.animate(
          [
            pos(ox, oy, 0.4, 0),
            // Pop in at the centre before leaving, so the origin is noticed.
            { ...pos(ox + spread, oy, 1, 1), offset: 0.12 },
            { ...pos(midX, midY, 1, 1), offset: 0.5 },
            pos(target.x, target.y, 0.55, 0.9),
          ],
          { duration: FLIGHT_MS, easing: "cubic-bezier(0.5, 0, 0.7, 0.4)", fill: "forwards" },
        );
        animations.push(flight);
        flight.onfinish = () => {
          orb.remove();
          landed += 1;
          if (landed === count) layer.remove();
          // Arrival: the ring swells a little with each orb.
          target.ring?.animate?.(
            [{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }],
            { duration: 220, easing: "ease-out" },
          );
        };
      }, START_DELAY_MS + i * STAGGER_MS),
    );
  }

  return () => {
    timers.forEach(clearTimeout);
    animations.forEach((a) => a.cancel());
    layer.remove();
  };
}
