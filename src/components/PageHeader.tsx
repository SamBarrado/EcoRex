import { useNavigate } from "react-router-dom";

export default function PageHeader() {
  const navigate = useNavigate();
  return (
    <button
      className="page-header-logo"
      onClick={() => navigate("/inicio")}
      aria-label="Volver a Inicio"
    >
      <img src="/logo/logo-ecorex.png" alt="Ecorex" />
    </button>
  );
}
