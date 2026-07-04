import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyCollection, Discovery, ApiError } from "../lib/api";

export default function ColeccionPage() {
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState<Discovery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
      {discoveries && discoveries.length === 0 && <p>Aún no has descubierto ningún dino.</p>}
      {discoveries && discoveries.length > 0 && (
        <div className="grid">
          {discoveries.map((d) => (
            <div className="card" key={d.discovery_id}>
              <img src={d.image_url} alt={d.common_name} style={{ width: "100%", borderRadius: 8 }} />
              <strong>{d.common_name}</strong>
              <div>{d.scientific_name}</div>
              <div>Fractae: {d.fractae_child_name}</div>
              <div>Rareza: {d.rarity_name}</div>
              <div>Fase: {d.phase}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
