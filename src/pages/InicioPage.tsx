import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFuseEligible, getMyProfile, ProfileStats, ApiError } from "../lib/api";
import { version } from "../../package.json";

export default function InicioPage() {
  const navigate = useNavigate();
  const [fusionUnlocked, setFusionUnlocked] = useState(false);
  const [profile, setProfile] = useState<ProfileStats | null>(null);

  useEffect(() => {
    getFuseEligible()
      .then((data) => setFusionUnlocked(data.eligible.length > 0))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
    getMyProfile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
  }, [navigate]);

  const progressPct =
    profile && profile.speciesTotalCount > 0
      ? Math.round((profile.speciesDiscoveredCount / profile.speciesTotalCount) * 100)
      : 0;

  return (
    <div className="page">
      <img src="/logo/logo-ecorex.png" alt="Ecorex" className="home-logo" />

      {profile && (
        <div className="card">
          <div className="stat">
            <span>Nivel {profile.level}</span>
            <span>
              {profile.xpForNextLevel === null
                ? "MAX"
                : `${profile.xpIntoLevel}/${profile.xpForNextLevel} XP`}
            </span>
          </div>
          {profile.xpForNextLevel !== null && (
            <div className="level-progress-bar">
              <div
                className="level-progress-fill"
                style={{ width: `${Math.round((profile.xpIntoLevel / profile.xpForNextLevel) * 100)}%` }}
              />
            </div>
          )}
          <div className="stat">
            <span>Especies descubiertas</span>
            <span>
              {profile.speciesDiscoveredCount}/{profile.speciesTotalCount} ({progressPct}%)
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-compact">
        <div
          className={fusionUnlocked ? "card card-clickable card-compact" : "card card-compact"}
          style={{ opacity: fusionUnlocked ? 1 : 0.5 }}
          role={fusionUnlocked ? "button" : undefined}
          tabIndex={fusionUnlocked ? 0 : undefined}
          onClick={() => fusionUnlocked && navigate("/fusion")}
          onKeyDown={(e) => fusionUnlocked && (e.key === "Enter" || e.key === " ") && navigate("/fusion")}
        >
          <img className="card-icon" src="/icons/altar-fusion.png" alt="" />
          <strong>Altar de Fusión {!fusionUnlocked && "🔒"}</strong>
        </div>
        <div className="card card-compact" style={{ opacity: 0.5 }}>
          <img className="card-icon" src="/icons/eco.png" alt="" />
          <strong>Eco 🔒</strong>
        </div>
        <div className="card card-compact" style={{ opacity: 0.5 }}>
          <img className="card-icon" src="/icons/album.png" alt="" />
          <strong>Álbum 🔒</strong>
        </div>
        <div className="card card-compact" style={{ opacity: 0.5 }}>
          <img className="card-icon" src="/icons/perfil.png" alt="" />
          <strong>Amigos 🔒</strong>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#7fa98a", fontSize: "0.75rem" }}>v{version}</p>
    </div>
  );
}
