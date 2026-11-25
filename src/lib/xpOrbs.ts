// XP orbs: glowing dots that leave a source element and fly to the level ring
// (`[data-level-hud]`). Pure Web Animations API, no library. The ring can be
// hidden (immersive moments hide it with the bottom nav); then the orbs aim at
// the spot where it sits, and the ring's own gain flash covers the arrival
// once it comes back.

const MIN_ORBS = 3;
const MAX_ORBS = 10;
const XP_PER_ORB = 5;
const START_DELAY_MS = 350;
const STAGGER_MS = 70;
const FLIGHT_MS = 700;

export function orbCountFor(xp: number): number {
  return Math.max(MIN_ORBS, Math.min(MAX_ORBS, Math.ceil(xp / XP_PER_ORB)));
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
 * Launches the orbs. Returns a cleanup that cancels whatever is still in
 * flight. Does nothing under reduced motion or where WAAPI is missing.
 */
export function flyOrbs({ from, amount }: { from: HTMLElement; amount: number }): () => void {
  if (prefersReducedMotion() || typeof from.animate !== "function") return () => {};

  const layer = document.createElement("div");
  layer.className = "xp-orb-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const origin = from.getBoundingClientRect();
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  const count = orbCountFor(amount);
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
          [pos(ox, oy, 0.4, 0), { ...pos(midX, midY, 1, 1), offset: 0.4 }, pos(target.x, target.y, 0.55, 0.9)],
          { duration: FLIGHT_MS, easing: "cubic-bezier(0.5, 0, 0.7, 0.4)", fill: "forwards" },
        );
        animations.push(flight);
        flight.onfinish = () => {
          orb.remove();
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
