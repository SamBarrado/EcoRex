import { useEffect, useLayoutEffect, useRef, useState } from "react";

const CARD_BACK_PATH = "/card-back.png";
const CARD_NATURAL_WIDTH = 300;
// Matches the Percibir pack art aspect ratio (sobre.png, 1024x1536) so the
// closed pack and the revealed card read as the same physical object.
const CARD_ASPECT = 1536 / 1024;
const CARD_NATURAL_HEIGHT = CARD_NATURAL_WIDTH * CARD_ASPECT;
const FLIP_DURATION_MS = 800;
const DRAG_SENSITIVITY_DEG_PER_PX = 0.6;
const DRAG_SNAP_TRANSITION = "320ms ease-out";
const NO_TRANSITION = "none";

// Inertia: after release, the card keeps spinning at its last drag velocity
// for a short coast before settling on the nearest face, instead of an
// instant snap — makes the flick feel physical rather than mechanical.
const INERTIA_DECAY_PER_FRAME = 0.92;
const INERTIA_MIN_VELOCITY_DEG_PER_MS = 0.02;
const VELOCITY_SAMPLE_WINDOW_MS = 120;

// Vertical swipe-up-to-confirm gesture.
const LIFT_COMMIT_THRESHOLD_PX = 90;
const LIFT_FLY_AWAY_TRANSITION = "360ms cubic-bezier(0.2, 0.8, 0.4, 1)";
const LIFT_SPRING_BACK_TRANSITION = "260ms ease-out";

export interface RevealCardProps {
  imageUrl: string;
  commonName: string;
  scientificName: string;
  phase: string;
  rarityTier: { slug: string; name: string };
  discoveryCode: string;
  fractaeChildName?: string;
  glowColor: string;
  spins?: number;
  onCommitUp?: () => void;
  commitHint?: string;
}

export function RevealCard({
  imageUrl,
  commonName,
  scientificName,
  phase,
  rarityTier,
  discoveryCode,
  fractaeChildName,
  glowColor,
  spins = 0,
  onCommitUp,
  commitHint,
}: RevealCardProps) {
  const flipDurationMs = FLIP_DURATION_MS * (1 + spins);
  const flipTransition = `transform ${flipDurationMs}ms ease-out`;
  const [hasFlippedIn, setHasFlippedIn] = useState(false);
  const [settled, setSettled] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [spinDeg, setSpinDeg] = useState(0);
  const [transition, setTransition] = useState(flipTransition);
  const [liftY, setLiftY] = useState(0);
  const [liftTransition, setLiftTransition] = useState(NO_TRANSITION);
  const [committing, setCommitting] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragBaseSpinRef = useRef(0);
  const velocitySamplesRef = useRef<{ t: number; spin: number }[]>([]);
  const inertiaFrameRef = useRef<number | null>(null);

  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Triggers the flip-in transition on the first paint after mount, then
    // swaps the visible face halfway through that transition. Both are
    // scheduled from the same callback so they land in the same timer tick
    // instead of round-tripping through a render + a second effect.
    let cancelled = false;
    let facingTimeout: ReturnType<typeof setTimeout> | null = null;
    let settledTimeout: ReturnType<typeof setTimeout> | null = null;
    requestAnimationFrame(() => {
      if (cancelled) return;
      setHasFlippedIn(true);
      facingTimeout = setTimeout(() => {
        if (!cancelled) setFacing("front");
      }, flipDurationMs / 2);
      // The swipe-up-to-confirm affordance only makes sense once the card has
      // actually stopped moving — showing it mid-spin (still 3D-tilted,
      // visually spilling outside its box) reads as broken, not helpful.
      settledTimeout = setTimeout(() => {
        if (!cancelled) setSettled(true);
      }, flipDurationMs);
    });
    return () => {
      cancelled = true;
      if (facingTimeout !== null) {
        clearTimeout(facingTimeout);
      }
      if (settledTimeout !== null) {
        clearTimeout(settledTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    function update() {
      if (!outer) return;
      setScale(
        outer.offsetWidth > 0
          ? Math.min(1, outer.offsetWidth / CARD_NATURAL_WIDTH)
          : 1,
      );
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(outer);
    return () => resizeObserver.disconnect();
  }, []);

  const baseFlipDeg = hasFlippedIn ? 0 : 180 + spins * 360;

  useEffect(
    () => () => {
      if (inertiaFrameRef.current !== null)
        cancelAnimationFrame(inertiaFrameRef.current);
    },
    [],
  );

  function snapToFacing(finalSpin: number, snapTransition: string) {
    const totalDeg = baseFlipDeg + finalSpin;
    const snapped = Math.round(totalDeg / 180) * 180;
    const mod = ((snapped % 360) + 360) % 360;
    setFacing(mod === 180 ? "back" : "front");
    setSpinDeg(snapped - baseFlipDeg);
    setTransition(snapTransition);
  }

  function coastWithInertia(startSpin: number, velocityDegPerMs: number) {
    let spin = startSpin;
    let velocity = velocityDegPerMs;
    let lastTime = performance.now();

    function frame(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      spin += velocity * dt;
      velocity *= INERTIA_DECAY_PER_FRAME;
      setTransition(NO_TRANSITION);
      setSpinDeg(spin);
      const totalDeg = baseFlipDeg + spin;
      const mod = ((totalDeg % 360) + 360) % 360;
      setFacing(mod > 90 && mod < 270 ? "back" : "front");

      if (Math.abs(velocity) > INERTIA_MIN_VELOCITY_DEG_PER_MS) {
        inertiaFrameRef.current = requestAnimationFrame(frame);
      } else {
        inertiaFrameRef.current = null;
        snapToFacing(spin, DRAG_SNAP_TRANSITION);
      }
    }

    inertiaFrameRef.current = requestAnimationFrame(frame);
  }

  function handleDragStart(clientX: number, clientY = 0) {
    if (committing) return;
    if (inertiaFrameRef.current !== null) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    dragBaseSpinRef.current = spinDeg;
    velocitySamplesRef.current = [{ t: performance.now(), spin: spinDeg }];
  }

  function handleDragMove(clientX: number, clientY = 0) {
    if (dragStartXRef.current === null) return;
    const deltaX = clientX - dragStartXRef.current;
    const nextSpin =
      dragBaseSpinRef.current + deltaX * DRAG_SENSITIVITY_DEG_PER_PX;
    setTransition(NO_TRANSITION);
    setSpinDeg(nextSpin);
    const totalDeg = baseFlipDeg + nextSpin;
    const mod = ((totalDeg % 360) + 360) % 360;
    setFacing(mod > 90 && mod < 270 ? "back" : "front");

    const now = performance.now();
    velocitySamplesRef.current.push({ t: now, spin: nextSpin });
    velocitySamplesRef.current = velocitySamplesRef.current.filter(
      (sample) => now - sample.t <= VELOCITY_SAMPLE_WINDOW_MS,
    );

    const deltaY = clientY - dragStartYRef.current;
    setLiftTransition(NO_TRANSITION);
    setLiftY(Math.min(0, deltaY));
  }

  function handleDragEnd() {
    if (dragStartXRef.current === null) return;
    dragStartXRef.current = null;

    if (onCommitUp && liftY <= -LIFT_COMMIT_THRESHOLD_PX) {
      setCommitting(true);
      setLiftTransition(LIFT_FLY_AWAY_TRANSITION);
      setLiftY(-1400);
      const flyDurationMs = parseInt(LIFT_FLY_AWAY_TRANSITION, 10) || 360;
      setTimeout(onCommitUp, flyDurationMs);
      return;
    }

    setLiftTransition(LIFT_SPRING_BACK_TRANSITION);
    setLiftY(0);

    const samples = velocitySamplesRef.current;
    const oldest = samples[0];
    const latest = samples[samples.length - 1];
    const elapsed = oldest && latest ? latest.t - oldest.t : 0;
    const velocity = elapsed > 0 ? (latest.spin - oldest.spin) / elapsed : 0;

    if (Math.abs(velocity) > INERTIA_MIN_VELOCITY_DEG_PER_MS) {
      coastWithInertia(spinDeg, velocity);
    } else {
      snapToFacing(spinDeg, DRAG_SNAP_TRANSITION);
    }
  }

  const totalRotateY = baseFlipDeg + spinDeg;

  // Holo sheen: a specular band whose angle and intensity track the card's
  // current tilt, peaking as the card turns edge-on (like real foil catching
  // the light), rather than a static overlay.
  const mod180 = ((totalRotateY % 180) + 180) % 180;
  const distFromEdgeOn = Math.abs(mod180 - 90);
  const sheenOpacity = Math.max(0, 1 - distFromEdgeOn / 90) * 0.5;

  const canCommitUp = Boolean(onCommitUp) && facing === "front" && settled;

  return (
    <div className="reveal-card-wrapper">
      {canCommitUp && !committing && (
        <div className="reveal-card-commit-hint" aria-live="polite">
          <span aria-hidden="true">↑</span>
          {commitHint ?? "Desliza hacia arriba para añadir al EcoDex"}
        </div>
      )}
      <div
        ref={outerRef}
        className="reveal-card-outer"
        style={{ height: CARD_NATURAL_HEIGHT * scale }}
      >
        <div
          className="reveal-card-inner"
          style={{
            width: CARD_NATURAL_WIDTH,
            transform: `translateX(-50%) scale(${scale}) translateY(${liftY}px)`,
            transition: liftTransition,
            opacity: committing ? 0 : 1,
          }}
        >
          <div
            className="card-perspective"
            data-testid="card-perspective"
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => {
              if (dragStartXRef.current !== null)
                handleDragMove(e.clientX, e.clientY);
            }}
            onMouseUp={handleDragEnd}
            onMouseLeave={() => {
              if (dragStartXRef.current !== null) handleDragEnd();
            }}
            onTouchStart={(e) =>
              handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
            }
            onTouchMove={(e) =>
              handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
            }
            onTouchEnd={handleDragEnd}
            onTouchCancel={handleDragEnd}
          >
            <div
              className="card-flipper"
              style={{ transform: `rotateY(${totalRotateY}deg)`, transition }}
            >
              <div
                className="card-face"
                data-testid="card-front"
                style={{
                  visibility: facing === "front" ? "visible" : "hidden",
                  borderColor: glowColor,
                  boxShadow: `0 0 24px ${glowColor}`,
                }}
              >
                <img
                  src={imageUrl}
                  alt={commonName}
                  className="species-image"
                />
                <div
                  className="reveal-card-sheen"
                  aria-hidden="true"
                  style={{
                    opacity: sheenOpacity,
                    background: `linear-gradient(${105 + totalRotateY}deg, transparent 40%, rgba(255,255,255,0.9) 50%, transparent 60%)`,
                  }}
                />
                <div className="reveal-card-body">
                  <div>
                    <strong>{commonName}</strong> ({scientificName})
                  </div>
                  {fractaeChildName && <div>Fractae: {fractaeChildName}</div>}
                  <div>Fase: {phase}</div>
                  <div>Rareza: {rarityTier.name}</div>
                  <div>Código: {discoveryCode}</div>
                </div>
              </div>
              <div
                className="card-face card-face-back"
                style={{ visibility: facing === "back" ? "visible" : "hidden" }}
              >
                <img
                  src={CARD_BACK_PATH}
                  alt="Ecorex"
                  className="card-back-image"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
