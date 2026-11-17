import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Card } from "./Card";
import { rarityTierIndex } from "../../lib/rarityGlow";

// ---- Reveal ("Barrido"): the card arrives showing its back, a line of light
// climbs it and uncovers the front, which sharpens as the line passes. ----
const INTRO_MS = 540;
const COVERED_MS = 620; // the back sits alone before the scan starts: mystery
const SCAN_MS = 1050;
const DEVELOP_MS = 1500;

// ---- Hand rotation: drag sideways, release and it springs onto a face. ----
const DRAG_DEG_PER_PX = 0.6;
const FLICK_LOOKAHEAD_FRAMES = 14;
const VELOCITY_WINDOW_MS = 100;
const MAX_VELOCITY_DEG_PER_FRAME = 50;
const SPRING_STIFFNESS = 0.07;
const SPRING_DAMPING = 0.22; // underdamped on purpose: a small bounce when it lands

// ---- Swipe up to add to the EcoDex. ----
const LIFT_COMMIT_THRESHOLD_PX = 90;
const LIFT_FLY_AWAY_MS = 360;
const LIFT_FLY_AWAY_TRANSITION = `transform ${LIFT_FLY_AWAY_MS}ms cubic-bezier(0.2, 0.8, 0.4, 1), opacity ${LIFT_FLY_AWAY_MS}ms ease-in`;

// ---- Levitation: the card floats; its shadow on the surface marks how high. ----
const BOB_PERIOD_MS = 1100;
const BOB_AMPLITUDE_PX = 6;
const HELD_LIFT_PX = 14;
const HOVER_TILT_DEG = 13;
const IDLE_SWAY_DEG = 6;
const GLOW_OPACITY = [0.12, 0.2, 0.3, 0.42, 0.55];
const FLOOR_OPACITY = [0.2, 0.28, 0.36, 0.48, 0.62];

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Signed angle in (-180, 180].
function normalizeDeg(a: number) {
  return ((((a % 360) + 540) % 360) - 180) || 0;
}

interface Motion {
  ry: number; // dragged rotation, degrees
  vy: number; // degrees per 16ms frame
  ty: number; // spring target: always a multiple of 180 (a face)
  h: number; // levitation offset, px
  hx: number; // hover tilt about Y, degrees
  hy: number; // hover tilt about X, degrees
  hovering: boolean;
  px: number;
  py: number;
  dragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  samples: { t: number; ry: number }[];
}

export interface CardSceneProps {
  imageUrl: string;
  commonName: string;
  scientificName: string;
  rarityTier: { slug: string; name: string };
  fractaeChildName?: string;
  fractaeIconUrl?: string;
  lorePhrase?: string;
  phase?: string;
  glowColor: string;
  /** "scan" plays the mystery reveal on mount; "none" shows the card right away. */
  reveal?: "scan" | "none";
  onCommitUp?: () => void;
  commitHint?: string;
}

export function CardScene({
  imageUrl,
  commonName,
  scientificName,
  rarityTier,
  fractaeChildName,
  fractaeIconUrl,
  lorePhrase,
  phase,
  glowColor,
  reveal = "scan",
  onCommitUp,
  commitHint,
}: CardSceneProps) {
  const tier = rarityTierIndex(rarityTier.slug);
  const [covered, setCovered] = useState(reveal === "scan");
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [committing, setCommitting] = useState(false);

  const sceneRef = useRef<HTMLDivElement>(null);
  const perspRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const flipperRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const motion = useRef<Motion>({
    ry: 0, vy: 0, ty: 0, h: 0, hx: 0, hy: 0, hovering: false, px: 0.5, py: 0.5,
    dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0, samples: [],
  });
  const reveal$ = useRef<{ timers: ReturnType<typeof setTimeout>[]; anims: Animation[] }>({ timers: [], anims: [] });

  // Ends the reveal on the spot (the user grabbed the card mid-scan, or the
  // scan finished): clears timers and effects and removes the back cover.
  const finishReveal = useCallback(() => {
    const r = reveal$.current;
    r.timers.forEach(clearTimeout);
    r.timers = [];
    r.anims.forEach((a) => {
      try {
        a.cancel();
      } catch {
        /* already finished */
      }
    });
    r.anims = [];
    if (fxRef.current) fxRef.current.innerHTML = "";
    setCovered(false);
  }, []);

  // ---- rarity feedback on landing: rings, flash, burst, shake ----
  const landing = useCallback((): void => {
    const fx = fxRef.current;
    const scene = sceneRef.current;
    if (!fx || !scene || typeof fx.animate !== "function") return;
    const r = reveal$.current;
    const color = glowColor;

    function ring(delay: number) {
      const d = document.createElement("div");
      d.className = "card-fx-ring";
      d.style.color = color;
      d.style.borderColor = color;
      fx!.appendChild(d);
      const a = d.animate(
        [
          { transform: "scale(1)", opacity: 0.9 },
          { transform: "scale(1.3)", opacity: 0 },
        ],
        { duration: 950, delay, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" },
      );
      a.onfinish = () => d.remove();
    }
    function flash(peak: number) {
      const d = document.createElement("div");
      d.className = "card-fx-flash";
      d.style.background = `radial-gradient(circle at 50% 46%, ${color}, transparent 62%)`;
      fx!.appendChild(d);
      const a = d.animate([{ opacity: 0 }, { opacity: peak, offset: 0.25 }, { opacity: 0 }], { duration: 650, easing: "ease-out" });
      a.onfinish = () => d.remove();
    }
    function burst(n: number) {
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "card-fx-pt";
        s.style.background = color;
        s.style.color = color;
        fx!.appendChild(s);
        const ang = Math.random() * Math.PI * 2;
        const dist = 110 + Math.random() * 120;
        const a = s.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 },
          ],
          { duration: 700 + Math.random() * 600, easing: "cubic-bezier(.1,.7,.3,1)" },
        );
        a.onfinish = () => s.remove();
      }
    }

    if (tier >= 1) ring(0);
    if (tier >= 2) {
      flash(0.5);
      ring(130);
    }
    if (tier >= 3) burst(tier === 3 ? 14 : 28);
    if (tier === 4) {
      ring(270);
      r.anims.push(
        scene.animate(
          [
            { transform: "translate(0,0)" },
            { transform: "translate(-3px,2px)" },
            { transform: "translate(3px,-2px)" },
            { transform: "translate(-2px,-1px)" },
            { transform: "translate(0,0)" },
          ],
          { duration: 320 },
        ),
      );
    }
    const glow = glowRef.current;
    if (glow) r.anims.push(glow.animate([{ opacity: GLOW_OPACITY[tier] * 2.2 }, { opacity: GLOW_OPACITY[tier] }], { duration: 1300, easing: "ease-out" }));
    const lift = liftRef.current;
    if (lift && tier >= 3) r.anims.push(lift.animate([{ transform: "scale(1)" }, { transform: "scale(1.045)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" }));
    const sweep = flipperRef.current?.querySelector<HTMLElement>(".card-sweep");
    if (sweep && tier >= 1) {
      sweep.style.opacity = "1";
      const a = sweep.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(120%)" }], { duration: 800, easing: "ease-in-out" });
      a.onfinish = () => {
        sweep.style.opacity = "0";
      };
    }
  }, [glowColor, tier]);

  // ---- reveal timeline (runs once, before first paint so the front is never seen) ----
  useLayoutEffect(() => {
    if (reveal !== "scan") return;
    if (prefersReducedMotion()) {
      setCovered(false);
      return;
    }
    const r = reveal$.current;
    const lift = liftRef.current;
    const flipper = flipperRef.current;
    if (!lift || !flipper) return;
    const canAnimate = typeof lift.animate === "function";
    const animate = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (!el || !canAnimate) return;
      r.anims.push(el.animate(kf, opts));
    };
    const later = (fn: () => void, ms: number) => {
      r.timers.push(setTimeout(fn, ms));
    };

    animate(
      lift,
      [
        { transform: "translateY(86px) scale(.84)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: INTRO_MS, easing: "cubic-bezier(.2,.8,.25,1)", fill: "both" },
    );

    later(() => {
      animate(
        flipper.querySelector(".card-veil"),
        [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
        { duration: SCAN_MS, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" },
      );
      animate(
        flipper.querySelector(".card-scanline"),
        [
          { top: "100%", opacity: 1 },
          { top: "0%", opacity: 1, offset: 0.96 },
          { top: "0%", opacity: 0 },
        ],
        { duration: SCAN_MS, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" },
      );
      animate(
        flipper.querySelector(".card-fc"),
        [
          { filter: "blur(7px) saturate(.15) brightness(1.5)" },
          { filter: "blur(7px) saturate(.15) brightness(1.5)", offset: 0.35 },
          { filter: "none" },
        ],
        { duration: DEVELOP_MS, easing: "ease-out" },
      );
      later(() => {
        setCovered(false);
        landing();
      }, SCAN_MS);
    }, COVERED_MS);

    return () => {
      r.timers.forEach(clearTimeout);
      r.timers = [];
      r.anims.forEach((a) => {
        try {
          a.cancel();
        } catch {
          /* already finished */
        }
      });
      r.anims = [];
    };
    // Runs once per mount; `landing` only closes over the (constant) rarity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- motion loop: spring rotation, hover tilt, light, levitation, shadow ----
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const m = motion.current;
    let raf = 0;
    let last = 0;
    let currentFacing: "front" | "back" = "front";

    function tick(now: number) {
      const tilt = tiltRef.current;
      if (!tilt) return; // unmounted: stop the loop
      const dt = last ? Math.min(48, now - last) : 16;
      last = now;
      const f = dt / 16;

      if (!m.dragging) {
        m.vy += ((m.ty - m.ry) * SPRING_STIFFNESS - m.vy * SPRING_DAMPING) * f;
        m.ry += m.vy * f;
      }

      let targetHx: number;
      let targetHy: number;
      if (m.dragging) {
        targetHx = 0;
        targetHy = 0;
      } else if (m.hovering) {
        targetHx = (m.px - 0.5) * 2 * HOVER_TILT_DEG;
        targetHy = -(m.py - 0.5) * 2 * HOVER_TILT_DEG * 0.8;
      } else if (!reduced) {
        targetHx = IDLE_SWAY_DEG * Math.sin(now / 1500);
        targetHy = 3.5 * Math.cos(now / 1900);
      } else {
        targetHx = 0;
        targetHy = 0;
      }
      m.hx += (targetHx - m.hx) * 0.12 * f;
      m.hy += (targetHy - m.hy) * 0.12 * f;

      const hoverTarget = reduced ? 0 : Math.sin(now / BOB_PERIOD_MS) * BOB_AMPLITUDE_PX + (m.dragging ? HELD_LIFT_PX : 0);
      m.h += (hoverTarget - m.h) * 0.1 * f;

      const ry = m.ry + m.hx;
      const rx = m.hy;
      tilt.style.transform = `translateY(${(-m.h).toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;

      const ang = normalizeDeg(ry);
      const c = Math.abs(Math.cos((ang * Math.PI) / 180));
      tilt.style.setProperty("--mx", (50 + (clamp(ang, -90, 90) / 90) * 46).toFixed(1));
      tilt.style.setProperty("--my", (50 - (clamp(rx, -60, 60) / 60) * 40).toFixed(1));
      tilt.style.setProperty("--dim", ((1 - c) * 0.62).toFixed(3));

      const air = clamp(m.h, -8, 22);
      const shadow = shadowRef.current;
      if (shadow) {
        const sc = (0.45 + 0.55 * c) * (1 - air * 0.011);
        shadow.style.transform = `translateX(${(Math.sin((ang * Math.PI) / 180) * 12).toFixed(1)}px) scale(${sc.toFixed(3)}, ${(1 - air * 0.008).toFixed(3)})`;
        shadow.style.opacity = ((0.55 + 0.45 * c) * (1 - air * 0.016)).toFixed(3);
        shadow.style.filter = `blur(${(4 + Math.max(0, air + 8) * 0.3).toFixed(1)}px)`;
      }
      const floor = floorRef.current;
      if (floor) floor.style.opacity = (FLOOR_OPACITY[tier] * (1 - air * 0.012)).toFixed(3);

      const nextFacing = Math.cos((m.ry * Math.PI) / 180) >= 0 ? "front" : "back";
      if (nextFacing !== currentFacing) {
        currentFacing = nextFacing;
        setFacing(nextFacing);
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tier]);

  useEffect(
    () => () => {
      if (commitTimerRef.current !== null) clearTimeout(commitTimerRef.current);
    },
    [],
  );

  // ---- gestures (pointer events: the same code path for mouse and touch) ----
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (committing) return;
    if (covered) finishReveal();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported (jsdom) or pointer already gone */
    }
    const m = motion.current;
    const now = performance.now();
    m.dragging = true;
    m.startX = m.lastX = e.clientX;
    m.startY = m.lastY = e.clientY;
    m.samples = [{ t: now, ry: m.ry }];
    perspRef.current?.classList.add("dragging");
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const m = motion.current;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      m.px = (e.clientX - rect.left) / rect.width;
      m.py = (e.clientY - rect.top) / rect.height;
    }
    m.hovering = e.pointerType === "mouse";
    if (!m.dragging) return;

    m.ry += (e.clientX - m.lastX) * DRAG_DEG_PER_PX;
    m.lastX = e.clientX;
    m.lastY = e.clientY;
    const dy = e.clientY - m.startY;
    if (perspRef.current) perspRef.current.style.transform = dy < 0 ? `translateY(${dy}px)` : "";

    const now = performance.now();
    m.samples.push({ t: now, ry: m.ry });
    m.samples = m.samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
  }

  function handlePointerEnd() {
    const m = motion.current;
    if (!m.dragging) return;
    m.dragging = false;
    const persp = perspRef.current;
    persp?.classList.remove("dragging");

    const dy = m.lastY - m.startY;
    if (onCommitUp && dy <= -LIFT_COMMIT_THRESHOLD_PX && persp) {
      setCommitting(true);
      persp.style.transition = LIFT_FLY_AWAY_TRANSITION;
      persp.style.transform = "translateY(-1400px)";
      persp.style.opacity = "0";
      commitTimerRef.current = setTimeout(onCommitUp, LIFT_FLY_AWAY_MS);
      return;
    }
    if (persp) persp.style.transform = "";

    const first = m.samples[0];
    const latest = m.samples[m.samples.length - 1];
    const elapsed = first && latest ? Math.max(1, latest.t - first.t) : 1;
    const velocity = first && latest ? clamp(((latest.ry - first.ry) / elapsed) * 16, -MAX_VELOCITY_DEG_PER_FRAME, MAX_VELOCITY_DEG_PER_FRAME) : 0;
    // A flick carries the card past the nearest face, so a strong throw spins it fully.
    m.vy = velocity;
    m.ty = Math.round((m.ry + velocity * FLICK_LOOKAHEAD_FRAMES) / 180) * 180;
  }

  function handlePointerLeave(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && !motion.current.dragging) motion.current.hovering = false;
  }

  const canCommitUp = Boolean(onCommitUp) && facing === "front" && !covered && !committing;
  const sceneStyle = { "--rc": glowColor } as CSSProperties;

  return (
    <div
      className="card-scene"
      ref={sceneRef}
      style={sceneStyle}
      data-facing={facing}
      data-revealed={covered ? "false" : "true"}
    >
      {canCommitUp && (
        <div className="reveal-card-commit-hint" aria-live="polite">
          <span aria-hidden="true">↑</span>
          {commitHint ?? "Desliza hacia arriba para añadir al EcoDex"}
        </div>
      )}
      <div className="card-stage">
        <div className="card-glow" ref={glowRef} style={{ opacity: GLOW_OPACITY[tier] }} />
        <div className="card-floor" ref={floorRef} />
        <div className="card-shadow" ref={shadowRef} />
        <div
          className="card-perspective"
          data-testid="card-perspective"
          ref={perspRef}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
        >
          <div className="card-tilt" ref={tiltRef}>
            <div className="card-lift" ref={liftRef}>
              <Card
                flipperRef={flipperRef}
                imageUrl={imageUrl}
                commonName={commonName}
                scientificName={scientificName}
                rarityTier={rarityTier}
                fractaeChildName={fractaeChildName}
                fractaeIconUrl={fractaeIconUrl}
                lorePhrase={lorePhrase}
                phase={phase}
                glowColor={glowColor}
                covered={covered}
              />
            </div>
          </div>
        </div>
        <div className="card-fx" ref={fxRef} />
      </div>
    </div>
  );
}
