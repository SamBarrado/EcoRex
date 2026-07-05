import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyCollection, Discovery, ApiError } from "../lib/api";

interface CollectionGroup {
  key: string;
  representative: Discovery;
  count: number;
}

function groupDiscoveries(discoveries: Discovery[]): CollectionGroup[] {
  const groups = new Map<string, Discovery[]>();
  for (const d of discoveries) {
    const key = `${d.species_id}_${d.phase}`;
    const list = groups.get(key);
    if (list) {
      list.push(d);
    } else {
      groups.set(key, [d]);
    }
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const representative = items.reduce((latest, current) =>
      new Date(current.discovered_at) > new Date(latest.discovered_at) ? current : latest
    );
    return { key, representative, count: items.length };
  });
}

export default function ColeccionPage() {
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState<Discovery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [previewGroup, setPreviewGroup] = useState<CollectionGroup | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getMyCollection()
      .then((data) => setDiscoveries(data.discoveries))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setError("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
      });
  }, [navigate, retryCount]);

  const groups = useMemo(() => (discoveries ? groupDiscoveries(discoveries) : null), [discoveries]);

  const availablePhases = useMemo(() => {
    if (!groups) return [];
    return Array.from(new Set(groups.map((g) => g.representative.phase)));
  }, [groups]);

  const visibleGroups = useMemo(() => {
    if (!groups) return null;
    if (!phaseFilter) return groups;
    return groups.filter((g) => g.representative.phase === phaseFilter);
  }, [groups, phaseFilter]);

  useLayoutEffect(() => {
    if (!previewGroup) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewGroup]);

  return (
    <div className="page">
      <h1>Mi Álbum</h1>
      {error && (
        <>
          <p className="error">{error}</p>
          <button onClick={() => setRetryCount((n) => n + 1)}>Reintentar</button>
        </>
      )}
      {!discoveries && !error && <p>Cargando...</p>}
      {groups && groups.length === 0 && <p>Aún no has descubierto ningún dino.</p>}
      {groups && groups.length > 0 && availablePhases.length > 1 && (
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
          {availablePhases.map((phase) => (
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
      {visibleGroups && visibleGroups.length === 0 && groups && groups.length > 0 && (
        <p>No tienes descubrimientos en esta fase.</p>
      )}
      {visibleGroups && visibleGroups.length > 0 && (
        <div className="grid">
          {visibleGroups.map((group) => (
            <div
              className="card card-clickable"
              key={group.key}
              style={{ position: "relative", padding: "0.5rem" }}
              role="button"
              tabIndex={0}
              onClick={() => setPreviewGroup(group)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPreviewGroup(group)}
            >
              {group.count > 1 && (
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
                  ×{group.count}
                </span>
              )}
              <img
                src={group.representative.image_url}
                alt={group.representative.common_name}
                className="species-image"
                loading="lazy"
              />
              <strong className="truncate" style={{ display: "block" }}>
                {group.representative.common_name}
              </strong>
              <div>Fase: {group.representative.phase}</div>
            </div>
          ))}
        </div>
      )}

      {previewGroup && (
        <div
          onClick={() => setPreviewGroup(null)}
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
            <img
              src={previewGroup.representative.image_url}
              alt={previewGroup.representative.common_name}
              className="species-image"
            />
            <strong>{previewGroup.representative.common_name}</strong>
            <div>{previewGroup.representative.scientific_name}</div>
            <div>Fractae: {previewGroup.representative.fractae_child_name}</div>
            <div>Rareza: {previewGroup.representative.rarity_name}</div>
            <div>Fase: {previewGroup.representative.phase}</div>
            <div>Código: {previewGroup.representative.discovery_code}</div>
            {previewGroup.count > 1 && <div>Cartas de esta especie y fase: {previewGroup.count}</div>}
            <button onClick={() => setPreviewGroup(null)} style={{ marginTop: "0.75rem" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
