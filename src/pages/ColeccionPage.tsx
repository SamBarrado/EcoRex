import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDex, DexSlot, ApiError } from "../lib/api";

function slotKey(slot: DexSlot) {
  return `${slot.species_id}_${slot.phase}`;
}

export default function ColeccionPage() {
  const navigate = useNavigate();
  const [currentWave, setCurrentWave] = useState<number | null>(null);
  const [slots, setSlots] = useState<DexSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [previewSlot, setPreviewSlot] = useState<DexSlot | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);

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

  useLayoutEffect(() => {
    if (!previewSlot) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewSlot]);

  return (
    <div className="page">
      <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <img src="/icons/album.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
        Mi Álbum
      </h1>
      {error && (
        <>
          <p className="error">{error}</p>
          <button onClick={() => setRetryCount((n) => n + 1)}>Reintentar</button>
        </>
      )}
      {!slots && !error && <p>Cargando...</p>}
      {slots !== null && slots.length === 0 && !error && <p>No hay ninguna wave activa todavía.</p>}
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
              background: phaseFilter === null ? "#3fae5a" : "#142218",
              color: phaseFilter === null ? "#06120a" : "#f2f6f3",
              flexShrink: 0,
            }}
          >
            Todas
          </button>
          {(["calma", "furia", "eco"] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => setPhaseFilter(phase)}
              style={{
                background: phaseFilter === phase ? "#3fae5a" : "#142218",
                color: phaseFilter === phase ? "#06120a" : "#f2f6f3",
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
        <div className="grid">
          {visibleSlots.map((slot) => (
            <div
              className="card card-clickable"
              key={slotKey(slot)}
              style={{ position: "relative", padding: "0.5rem" }}
              role="button"
              tabIndex={0}
              onClick={() => setPreviewSlot(slot)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPreviewSlot(slot)}
            >
              {!slot.locked && slot.count > 1 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
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
              <img
                src={slot.locked ? "/icons/carta-bloqueada.svg" : slot.image_url}
                alt={slot.locked ? "Carta bloqueada" : slot.common_name}
                className="species-image"
                loading="lazy"
              />
              <strong className="truncate" style={{ display: "block" }}>
                {slot.locked ? "???" : slot.common_name} {slot.locked && "🔒"}
              </strong>
              <div>Fase: {slot.phase}</div>
            </div>
          ))}
        </div>
      )}

      {previewSlot && (
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
          <div className="card" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            {previewSlot.locked ? (
              <>
                <img src="/icons/carta-bloqueada.svg" alt="Carta bloqueada" className="species-image" />
                <strong>??? 🔒</strong>
                <p>Carta aún no descubierta. Juega en Percibir para desbloquearla.</p>
              </>
            ) : (
              <>
                <img src={previewSlot.image_url} alt={previewSlot.common_name} className="species-image" />
                <strong>{previewSlot.common_name}</strong>
                <div>{previewSlot.scientific_name}</div>
                <div>Fractae: {previewSlot.fractae_child_name}</div>
                <div>Rareza: {previewSlot.rarity_name}</div>
                <div>Fase: {previewSlot.phase}</div>
                <div>Código: {previewSlot.discovery_code}</div>
                {previewSlot.count > 1 && <div>Cartas de esta especie y fase: {previewSlot.count}</div>}
              </>
            )}
            <button onClick={() => setPreviewSlot(null)} style={{ marginTop: "0.75rem" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
