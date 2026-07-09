import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDex, DexSlot, ApiError } from "../lib/api";
import { CardScene } from "../components/card/CardScene";
import { CardThumb } from "../components/card/CardThumb";
import { RARITY_GLOW } from "../lib/rarityGlow";

const REVEAL_DELAY_MS = 500;

function slotKey(slot: DexSlot) {
  return `${slot.species_id}_${slot.phase}`;
}

export default function ColeccionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const justUnlockedKey = (location.state as { justUnlockedKey?: string } | null)?.justUnlockedKey ?? null;
  const [currentWave, setCurrentWave] = useState<number | null>(null);
  const [slots, setSlots] = useState<DexSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [previewSlot, setPreviewSlot] = useState<DexSlot | null>(null);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);
  const [revealPending, setRevealPending] = useState(() => !!justUnlockedKey);
  const unlockedSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setError(null);
    getDex()
      .then((data) => {
        setCurrentWave(data.currentWave);
        setSlots(data.slots);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setError("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
      });
  }, [navigate, retryCount]);

  const visibleSlots = useMemo(() => {
    if (!slots) return null;
    if (!phaseFilter) return slots;
    return slots.filter((s) => s.phase === phaseFilter);
  }, [slots, phaseFilter]);

  const registeredCount = slots?.filter((s) => !s.locked).length ?? 0;
  const totalSlotsCount = slots?.length ?? 0;
  const registeredPct = totalSlotsCount > 0 ? Math.round((registeredCount / totalSlotsCount) * 100) : 0;

  useLayoutEffect(() => {
    if (!previewSlot) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewSlot]);

  useLayoutEffect(() => {
    if (!justUnlockedKey || !slots) return;
    unlockedSlotRef.current?.scrollIntoView({ block: "center" });
  }, [justUnlockedKey, slots]);

  useEffect(() => {
    if (!justUnlockedKey) return;
    const timeout = setTimeout(() => setRevealPending(false), REVEAL_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [justUnlockedKey]);

  function triggerLockedShake(key: string) {
    setShakeKey(key);
    setTimeout(() => setShakeKey((current) => (current === key ? null : current)), 320);
  }

  return (
    <div className="page">
      <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <img src="/icons/album.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
        EcoDex
      </h1>
      {error && (
        <>
          <p className="error">{error}</p>
          <button onClick={() => setRetryCount((n) => n + 1)}>Reintentar</button>
        </>
      )}
      {!slots && !error && <p>Cargando...</p>}
      {slots !== null && slots.length === 0 && !error && <p>No hay ninguna wave activa todavía.</p>}
      {slots && slots.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="stat">
            <span>Especies registradas</span>
            <span>
              {registeredCount}/{totalSlotsCount} ({registeredPct}%)
            </span>
          </div>
          <div className="level-progress-bar">
            <div className="level-progress-fill" style={{ width: `${registeredPct}%` }} />
          </div>
        </div>
      )}
      {currentWave !== null && slots && slots.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            marginBottom: "1rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            onClick={() => setPhaseFilter(null)}
            style={{
              background:
                phaseFilter === null
                  ? "linear-gradient(90deg, #3fae5a, #4fa9e0)"
                  : "rgba(255, 255, 255, 0.06)",
              color: phaseFilter === null ? "#06120a" : "#f2f6f3",
              boxShadow: phaseFilter === null ? undefined : "none",
              flexShrink: 0,
            }}
          >
            Todas
          </button>
          {(["balance", "exceso", "eco"] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => setPhaseFilter(phase)}
              style={{
                background:
                  phaseFilter === phase
                    ? "linear-gradient(90deg, #3fae5a, #4fa9e0)"
                    : "rgba(255, 255, 255, 0.06)",
                color: phaseFilter === phase ? "#06120a" : "#f2f6f3",
                boxShadow: phaseFilter === phase ? undefined : "none",
                flexShrink: 0,
                textTransform: "capitalize",
              }}
            >
              {phase}
            </button>
          ))}
        </div>
      )}
      {visibleSlots && visibleSlots.length > 0 && (
        <div className="grid ecodex-grid">
          {visibleSlots.map((slot) => {
            const isJustUnlocked = slotKey(slot) === justUnlockedKey;
            const showAsLocked = slot.locked || (isJustUnlocked && revealPending);
            return (
              <div
                className={`card card-clickable${isJustUnlocked && !revealPending ? " slot-just-unlocked" : ""}${shakeKey === slotKey(slot) ? " slot-locked-shake" : ""}`}
                key={slotKey(slot)}
                ref={isJustUnlocked ? unlockedSlotRef : undefined}
                style={{ position: "relative", padding: "0.5rem" }}
                role="button"
                tabIndex={0}
                onClick={() => (slot.locked ? triggerLockedShake(slotKey(slot)) : setPreviewSlot(slot))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  if (slot.locked) triggerLockedShake(slotKey(slot));
                  else setPreviewSlot(slot);
                }}
              >
                {!showAsLocked && slot.count > 1 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      zIndex: 2,
                      background: "#3fae5a",
                      color: "#06120a",
                      borderRadius: 999,
                      minWidth: 22,
                      height: 22,
                      padding: "0 6px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ×{slot.count}
                  </span>
                )}
                {isJustUnlocked && !slot.locked ? (
                  <div className="slot-reveal-stack">
                    <img
                      src="/icons/carta-bloqueada.png"
                      alt="Carta bloqueada"
                      className={`species-image slot-reveal-locked-img${revealPending ? "" : " slot-reveal-hidden"}`}
                      style={{ filter: "grayscale(0.5) brightness(0.75)" }}
                    />
                    <img
                      src={slot.image_url}
                      alt={slot.common_name}
                      className={`species-image slot-reveal-real-img${revealPending ? "" : " slot-reveal-visible"}`}
                      width={1536}
                      height={1024}
                    />
                  </div>
                ) : slot.locked ? (
                  <img
                    src="/icons/carta-bloqueada.png"
                    alt="Carta bloqueada"
                    className="species-image"
                    loading="lazy"
                    style={{ filter: "grayscale(0.5) brightness(0.75)", opacity: 0.85 }}
                  />
                ) : (
                  <CardThumb
                    imageUrl={slot.image_url}
                    commonName={slot.common_name}
                    scientificName={slot.scientific_name}
                    rarityTier={{ slug: slot.rarity_slug, name: slot.rarity_name }}
                    fractaeChildName={slot.fractae_child_name}
                    glowColor={RARITY_GLOW[slot.rarity_slug] ?? RARITY_GLOW.registrada}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewSlot && !previewSlot.locked && (
        <div
          onClick={() => setPreviewSlot(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 18, 10, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 100,
          }}
        >
          <div
            style={{ maxWidth: 320, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardScene
              imageUrl={previewSlot.image_url}
              commonName={previewSlot.common_name}
              scientificName={previewSlot.scientific_name}
              rarityTier={{ slug: previewSlot.rarity_slug, name: previewSlot.rarity_name }}
              fractaeChildName={previewSlot.fractae_child_name}
              lorePhrase={previewSlot.lore_phrase ?? undefined}
              glowColor={RARITY_GLOW[previewSlot.rarity_slug] ?? RARITY_GLOW.registrada}
            />
          </div>
          <button
            onClick={() => setPreviewSlot(null)}
            style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 101 }}
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
