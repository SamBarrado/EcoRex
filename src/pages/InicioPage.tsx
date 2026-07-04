import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFuseEligible, ApiError } from "../lib/api";

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
        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/percibir")}>
          <strong>Percibir</strong>
          <p>Descubre nuevas especies en su fase Calma.</p>
        </div>
        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/coleccion")}>
          <strong>Mi Colección</strong>
          <p>Revisa tu álbum de especies descubiertas.</p>
        </div>
        <div
          className="card"
          style={{ cursor: fusionUnlocked ? "pointer" : "default", opacity: fusionUnlocked ? 1 : 0.5 }}
          onClick={() => fusionUnlocked && navigate("/fusion")}
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
    </div>
  );
}
