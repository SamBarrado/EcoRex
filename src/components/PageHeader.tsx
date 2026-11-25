import { useNavigate } from "react-router-dom";

export default function PageHeader() {
  const navigate = useNavigate();
  return (
    <div className="page-header">
      <button className="page-back-btn" onClick={() => navigate(-1)} aria-label="Volver atrás">
        ←
      </button>
      {/* El altar con su lumbre hace de marca en las pantallas del Altar de Fusión (único uso de esta cabecera). */}
      <button className="page-header-logo page-header-altar" onClick={() => navigate("/inicio")} aria-label="Ir a Inicio">
        <img src="/icons/altar-fusion.webp" alt="" />
      </button>
    </div>
  );
}
