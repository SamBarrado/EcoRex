import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile, logout, ProfileStats, ApiError } from "../lib/api";

export default function PerfilPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setError("No se pudo cargar tu perfil");
      });
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <p>Cargando...</p>
      </div>
    );
  }

  const progressPct =
    profile.speciesTotalCount > 0
      ? Math.round((profile.speciesDiscoveredCount / profile.speciesTotalCount) * 100)
      : 0;

  return (
    <div className="page">
      <h1>Yo</h1>
      <div className="card">
        <strong>{profile.user.display_name || profile.user.email}</strong>
        <div>Rango de explorador: {profile.explorerRank}</div>
      </div>

      <div className="card">
        <div className="stat">
          <span>Progreso de colección</span>
          <span>
            {profile.speciesDiscoveredCount}/{profile.speciesTotalCount} ({progressPct}%)
          </span>
        </div>
        <div className="stat">
          <span>Capturas totales</span>
          <span>{profile.totalDiscoveries}</span>
        </div>
        <div className="stat">
          <span>Duplicados</span>
          <span>{profile.duplicateCount}</span>
        </div>
      </div>

      {profile.rarityBreakdown.length > 0 && (
        <div className="card">
          <strong>Por rareza</strong>
          {profile.rarityBreakdown.map((tier) => (
            <div className="stat" key={tier.slug}>
              <span>{tier.name}</span>
              <span>{tier.count}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
