import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDex, DexSlot, DexSlotRevealed, ApiError } from "../lib/api";
import { PhaseFilter } from "../components/ecodex/PhaseFilter";
import { EcodexTile } from "../components/ecodex/EcodexTile";
import { CardPreviewModal } from "../components/ecodex/CardPreviewModal";

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
  const [previewSlot, setPreviewSlot] = useState<DexSlotRevealed | null>(null);
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

  // The grid keeps the "???" placeholder slots (they tease the next wave), but
  // only playable ones count toward the percentage, or it could never reach 100 %.
  const registeredCount = slots?.filter((s) => !s.locked).length ?? 0;
  const totalSlotsCount = slots?.filter((s) => s.playable !== false).length ?? 0;
  const registeredPct = totalSlotsCount > 0 ? Math.round((registeredCount / totalSlotsCount) * 100) : 0;

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
      <h1 className="ecodex-title">
        <img src="/icons/album.png" alt="" className="ecodex-title-icon" />
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
        <div className="card">
          <div className="stat">
            <span>Registros</span>
            <span>
              {registeredCount}/{totalSlotsCount} ({registeredPct}%)
            </span>
          </div>
          <div className="level-progress-bar">
            <div className="level-progress-fill" style={{ width: `${registeredPct}%` }} />
          </div>
        </div>
      )}
      {currentWave !== null && slots && slots.length > 0 && <PhaseFilter value={phaseFilter} onChange={setPhaseFilter} />}
      {visibleSlots && visibleSlots.length > 0 && (
        <div className="grid ecodex-grid">
          {visibleSlots.map((slot) => {
            const key = slotKey(slot);
            const isJustUnlocked = key === justUnlockedKey;
            return (
              <EcodexTile
                key={key}
                slot={slot}
                isJustUnlocked={isJustUnlocked}
                revealPending={revealPending}
                shaking={shakeKey === key}
                tileRef={isJustUnlocked ? unlockedSlotRef : undefined}
                onOpen={setPreviewSlot}
                onLockedClick={() => triggerLockedShake(key)}
              />
            );
          })}
        </div>
      )}

      {previewSlot && <CardPreviewModal slot={previewSlot} onClose={() => setPreviewSlot(null)} />}
    </div>
  );
}
