import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpecies, discover, Species, DiscoverResult, ApiError } from "../lib/api";

const PHASES = ["calma", "furia", "eco"];

export default function ExplorarPage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species[] | null>(null);
  const [phase, setPhase] = useState("calma");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpecies()
      .then((data) => setSpecies(data.species))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setError("No se pudo cargar el catálogo");
      });
  }, [navigate]);

  async function handleDiscover(speciesId: number) {
    setError(null);
    setResult(null);
    setLoadingId(speciesId);
    try {
      const data = await discover({ speciesId, phase });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar el descubrimiento");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="page">
      <h1>Explorar</h1>

      <div className="card">
        <strong>Fase</strong>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{ background: p === phase ? "#3fae5a" : "#22331f" }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          <strong>¡Descubrimiento!</strong>
          <img src={result.imageUrl} alt={result.commonName} style={{ width: "100%", borderRadius: 8 }} />
          <div>{result.commonName} ({result.scientificName})</div>
          <div>Rareza: {result.rarityTier.name}</div>
          <div>Variante única: {result.isUniqueVariant ? "sí" : "no"}</div>
          <div>Código: {result.discoveryCode}</div>
        </div>
      )}

      {!species && <p>Cargando catálogo...</p>}
      {species &&
        species.map((s) => (
          <div className="card" key={s.id}>
            <strong>{s.common_name}</strong>
            <div>{s.scientific_name}</div>
            <div>Fractae: {s.fractae_child_name}</div>
            <button onClick={() => handleDiscover(s.id)} disabled={loadingId === s.id}>
              {loadingId === s.id ? "Descubriendo..." : "Descubrir"}
            </button>
          </div>
        ))}
    </div>
  );
}
