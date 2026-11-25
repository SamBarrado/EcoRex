import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isPushSupported, getNotificationPermission } from "../lib/push";

const DISMISSED_KEY = "ecorex_push_onboarding_dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage unavailable: the tile just won't persist its dismissal.
  }
}

export default function PushOnboardingTile() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (dismissed || !isPushSupported() || getNotificationPermission() !== "default") {
    return null;
  }

  // Any answer counts as "chosen": the tile must not come back on later visits
  // to Inicio even if the browser permission is still "default".
  function dismiss() {
    rememberDismissed();
    setDismissed(true);
  }

  return (
    <div className="card">
      <strong>Activa las notificaciones</strong>
      <p>Te avisamos cuando tengas energía lista para descubrir de nuevo.</p>
      <div className="btn-row">
        <button
          onClick={() => {
            dismiss();
            navigate("/perfil");
          }}
        >
          Activar
        </button>
        <button className="btn-secondary" onClick={dismiss}>Ahora no</button>
      </div>
    </div>
  );
}
