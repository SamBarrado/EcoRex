import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFuseEligible, ApiError } from "../lib/api";
import { version } from "../../package.json";

export default function InicioPage() {
  const navigate = useNavigate();
  const [fusionUnlocked, setFusionUnlocked] = useState(false);

  useEffect(() => {
    getFuseEligible()
      .then((data) => setFusionUnlocked(data.eligible.length > 0))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
  }, [navigate]);

  return (
    <div className="page">
      <img src="/logo/logo-ecorex.png" alt="Ecorex" className="home-logo" />
      <div className="grid grid-compact">
        <div
          className="card card-clickable card-compact"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/percibir")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/percibir")}
        >
          <img className="card-icon" src="/icons/percibir.png" alt="" />
          <strong>Percibir</strong>
        </div>
        <div
          className="card card-clickable card-compact"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/coleccion")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/coleccion")}
        >
          <img className="card-icon" src="/icons/mi-coleccion.png" alt="" />
          <strong>Mi Colección</strong>
        </div>
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
