import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpecies, getEnergy, discover, Species, ApiError } from "../lib/api";
import { PercibirRitual } from "../components/PercibirRitual";

export default function PercibirPage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species[] | null>(null);
  const [energyResetAt, setEnergyResetAt] = useState<number | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoadError(null);
    getSpecies()
      .then((speciesData) => {
        setSpecies(speciesData.species);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setLoadError("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
      });
    getEnergy()
      .then((data) => setEnergyResetAt(data.remaining > 0 ? null : data.resetAt))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
  }, [navigate, retryCount]);

  if (loadError) {
    return (
      <div className="page">
        <div className="card">
          <p className="error">{loadError}</p>
          <button onClick={() => setRetryCount((n) => n + 1)}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!species) {
    return (
      <div className="page">
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <PercibirRitual
      species={species}
      discoverFn={discover}
      onUnauthorized={() => navigate("/login")}
      energyResetAt={energyResetAt}
    />
  );
}
