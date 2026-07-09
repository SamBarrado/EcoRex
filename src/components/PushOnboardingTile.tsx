import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isPushSupported, getNotificationPermission } from "../lib/push";

export default function PushOnboardingTile() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isPushSupported() || getNotificationPermission() !== "default") {
    return null;
  }

  return (
    <div className="card">
      <strong>Activa las notificaciones</strong>
      <p>Te avisamos cuando tengas energía lista para descubrir de nuevo.</p>
      <button
        onClick={() => {
          setDismissed(true);
          navigate("/perfil");
        }}
      >
        Activar
      </button>
      <button onClick={() => setDismissed(true)}>Ahora no</button>
    </div>
  );
}
