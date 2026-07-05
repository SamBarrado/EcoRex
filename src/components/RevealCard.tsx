import { useEffect, useLayoutEffect, useRef, useState } from "react";

const CARD_BACK_PATH = "/card-back.png";
const CARD_NATURAL_WIDTH = 300;
const FLIP_DURATION_MS = 800;
const DRAG_SENSITIVITY_DEG_PER_PX = 0.6;
const DRAG_SNAP_TRANSITION = "320ms ease-out";
const NO_TRANSITION = "none";

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
}: RevealCardProps) {
  const flipDurationMs = FLIP_DURATION_MS * (1 + spins);
  const flipTransition = `transform ${flipDurationMs}ms ease-out`;
  const [hasFlippedIn, setHasFlippedIn] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [spinDeg, setSpinDeg] = useState(0);
  const [transition, setTransition] = useState(flipTransition);
  const dragStartXRef = useRef<number | null>(null);
  const dragBaseSpinRef = useRef(0);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    // Triggers the flip-in transition on the first paint after mount, then
    // swaps the visible face halfway through that transition. Both are
    // scheduled from the same callback so they land in the same timer tick
    // instead of round-tripping through a render + a second effect.
    let cancelled = false;
    let facingTimeout: ReturnType<typeof setTimeout> | null = null;
    requestAnimationFrame(() => {
      if (cancelled) return;
      setHasFlippedIn(true);
      facingTimeout = setTimeout(() => {
        if (!cancelled) setFacing("front");
      }, flipDurationMs / 2);
    });
    return () => {
      cancelled = true;
      if (facingTimeout !== null) {
        clearTimeout(facingTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function update() {
      if (!outer || !inner) return;
      setScale(outer.offsetWidth > 0 ? Math.min(1, outer.offsetWidth / CARD_NATURAL_WIDTH) : 1);
      setNaturalHeight(inner.offsetHeight);
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(outer);
    resizeObserver.observe(inner);
    return () => resizeObserver.disconnect();
  }, []);

  const baseFlipDeg = hasFlippedIn ? 0 : 180 + spins * 360;

  function handleDragStart(clientX: number) {
    dragStartXRef.current = clientX;
    dragBaseSpinRef.current = spinDeg;
  }

  function handleDragMove(clientX: number) {
    if (dragStartXRef.current === null) return;
    const deltaX = clientX - dragStartXRef.current;
    const nextSpin = dragBaseSpinRef.current + deltaX * DRAG_SENSITIVITY_DEG_PER_PX;
    setTransition(NO_TRANSITION);
    setSpinDeg(nextSpin);
    const totalDeg = baseFlipDeg + nextSpin;
    const mod = ((totalDeg % 360) + 360) % 360;
    setFacing(mod > 90 && mod < 270 ? "back" : "front");
  }

  function handleDragEnd() {
    if (dragStartXRef.current === null) return;
    dragStartXRef.current = null;
    setSpinDeg((current) => {
      const totalDeg = baseFlipDeg + current;
      const snapped = Math.round(totalDeg / 180) * 180;
      const mod = ((snapped % 360) + 360) % 360;
      setFacing(mod === 180 ? "back" : "front");
      return snapped - baseFlipDeg;
    });
    setTransition(DRAG_SNAP_TRANSITION);
  }

  const totalRotateY = baseFlipDeg + spinDeg;

  return (
    <div
      ref={outerRef}
      className="reveal-card-outer"
      style={{ height: naturalHeight ? naturalHeight * scale : undefined }}
    >
      <div
        ref={innerRef}
        className="reveal-card-inner"
        style={{ width: CARD_NATURAL_WIDTH, transform: `translateX(-50%) scale(${scale})` }}
      >
        <div
          className="card-perspective"
          data-testid="card-perspective"
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => {
            if (dragStartXRef.current !== null) handleDragMove(e.clientX);
          }}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => {
            if (dragStartXRef.current !== null) handleDragEnd();
          }}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
        >
          <div className="card-flipper" style={{ transform: `rotateY(${totalRotateY}deg)`, transition }}>
            <div
              className="card-face"
              data-testid="card-front"
              style={{
                visibility: facing === "front" ? "visible" : "hidden",
                borderColor: glowColor,
                boxShadow: `0 0 24px ${glowColor}`,
              }}
            >
              <img src={imageUrl} alt={commonName} className="species-image" />
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
              <img src={CARD_BACK_PATH} alt="Ecorex" className="card-back-image" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
