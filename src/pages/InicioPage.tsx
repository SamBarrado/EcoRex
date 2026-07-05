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
      <h1>Ecorex</h1>
      <div className="grid">
        <div
          className="card card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/percibir")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/percibir")}
        >
          <strong>Percibir</strong>
          <p>Descubre nuevas especies en su fase Calma.</p>
        </div>
        <div
          className="card card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/coleccion")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/coleccion")}
        >
          <strong>Mi Colección</strong>
          <p>Revisa tu álbum de especies descubiertas.</p>
        </div>
        <div
          className={fusionUnlocked ? "card card-clickable" : "card"}
          style={{ opacity: fusionUnlocked ? 1 : 0.5 }}
          role={fusionUnlocked ? "button" : undefined}
          tabIndex={fusionUnlocked ? 0 : undefined}
          onClick={() => fusionUnlocked && navigate("/fusion")}
          onKeyDown={(e) => fusionUnlocked && (e.key === "Enter" || e.key === " ") && navigate("/fusion")}
        >
          <strong>Altar de Fusión {!fusionUnlocked && "🔒"}</strong>
          <p>
            {fusionUnlocked
              ? "Fusiona 5 duplicados de Calma para obtener una Furia."
              : "Necesitas 5 duplicados de Calma de una misma especie."}
          </p>
        </div>
        <div className="card" style={{ opacity: 0.5 }}>
          <strong>Eco 🔒</strong>
          <p>Próximamente.</p>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "#7fa98a", fontSize: "0.75rem" }}>v{version}</p>
    </div>
  );
}
