import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpecies, getEnergy, discover, Species, ApiError } from "../lib/api";
import { PercibirRitual } from "../components/PercibirRitual";
import { usePlayer } from "../lib/PlayerContext";

export default function PercibirPage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species[] | null>(null);
  const [energyResetAt, setEnergyResetAt] = useState<number | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { energy: playerEnergy, refresh: refreshPlayer } = usePlayer();

  // The shared snapshot is refreshed after every discovery, so spending the
  // last energy here seals the pack without leaving the screen.
  useEffect(() => {
    if (playerEnergy) setEnergyResetAt(playerEnergy.remaining > 0 ? null : playerEnergy.resetAt);
  }, [playerEnergy]);

  // When the countdown ends, re-sync so the pack becomes available again.
  useEffect(() => {
    if (!energyResetAt) return;
    const timer = setTimeout(refreshPlayer, Math.max(0, energyResetAt - Date.now()) + 500);
    return () => clearTimeout(timer);
  }, [energyResetAt, refreshPlayer]);

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
