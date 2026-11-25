import { useState } from "react";
import type { OnboardingState } from "../lib/api";
import { isPushSupported, getNotificationPermission, subscribeToPush } from "../lib/push";

// "Primeros pasos" (design chosen 2026-11-18): a checklist with a prize. The
// steps come from the server (real data); the card only draws them.

const LABELS: Record<OnboardingState["steps"][number]["slug"], string> = {
  account: "Crear tu cuenta",
  pack: "Abrir tu primer sobre",
  ecodex: "Visitar tu EcoDex",
  push: "Activar avisos de energía",
  mission: "Completar una misión",
};

const ACTIONS: Partial<Record<OnboardingState["steps"][number]["slug"], { label: string; to: string }>> = {
  pack: { label: "Ir", to: "/percibir" },
  ecodex: { label: "Ir", to: "/coleccion" },
  push: { label: "Activar", to: "/perfil" },
};

export function OnboardingChecklist({
  state,
  onGo,
  onChanged,
}: {
  state: OnboardingState;
  onGo: (to: string) => void;
  /** Called after a step was completed from the card itself (reload the state). */
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  // "Activar" subscribes right here (it is a tap, so the permission prompt is
  // allowed). Only if that is impossible (unsupported, denied, error) we send
  // the player to Perfil, where the switch explains why.
  async function activatePush() {
    if (busy) return;
    if (!isPushSupported()) return onGo("/perfil");
    setBusy(true);
    try {
      await subscribeToPush();
      // subscribeToPush returns quietly when the player refuses the prompt.
      if (getNotificationPermission() !== "granted") return onGo("/perfil");
      onChanged?.();
    } catch {
      onGo("/perfil");
    } finally {
      setBusy(false);
    }
  }

  const done = state.steps.filter((s) => s.done).length;
  const total = state.steps.length;

  return (
    <div className="card onboarding-card">
      <div className="stat">
        <strong>Primeros pasos</strong>
        <span>
          {done}/{total}
        </span>
      </div>
      <div className="level-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="level-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ul className="onboarding-steps">
        {state.steps.map((step) => {
          const action = !step.done ? ACTIONS[step.slug] : undefined;
          return (
            <li key={step.slug} className={step.done ? "done" : undefined}>
              <span className="onboarding-box" aria-hidden="true">{step.done ? "✓" : ""}</span>
              <span className="onboarding-label">
                {LABELS[step.slug]}
                {step.done && <span className="sr-only"> (hecho)</span>}
              </span>
              {action && (
                <button
                  className="onboarding-mini"
                  disabled={busy && step.slug === "push"}
                  onClick={() => (step.slug === "push" ? void activatePush() : onGo(action.to))}
                >
                  {action.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="home-bonus">
        <span>🎁 Al completarlos</span>
        <span>+50 XP y ⚡ llena</span>
      </div>
    </div>
  );
}
