import { useNavigate } from "react-router-dom";

export default function PageHeader() {
  const navigate = useNavigate();
  return (
    <div className="page-header">
      <button className="page-back-btn" onClick={() => navigate(-1)} aria-label="Volver atrás">
        ←
      </button>
      <button className="page-header-logo" onClick={() => navigate("/inicio")} aria-label="Ir a Inicio">
        <img src="/logo/logo-ecorex.png" alt="Ecorex" />
      </button>
    </div>
  );
}
