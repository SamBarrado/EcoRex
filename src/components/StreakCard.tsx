import type { StreakState } from "../lib/api";
import { streakLabel } from "../lib/streak";

export function StreakCard({ streak }: { streak: StreakState | undefined | null }) {
  if (!streak) return null;

  const { days, activeToday, nextMilestone, nextMilestoneXp } = streak;
  const daysToGo = nextMilestone - days;

  if (days === 0) {
    return (
      <div className="card streak-card">
        <strong>🔥 Racha</strong>
        <div className="streak-hint">
          Percibe hoy y empieza una racha. A los {nextMilestone} días: +{nextMilestoneXp} XP y energía recargada.
        </div>
      </div>
    );
  }

  return (
    <div className="card streak-card">
      <div className="stat">
        <strong>🔥 Racha: {streakLabel(days)}</strong>
        <span>
          {daysToGo === 1 ? "Mañana" : `En ${daysToGo} días`}: +{nextMilestoneXp} XP y energía
        </span>
      </div>
      {!activeToday && <div className="streak-hint streak-hint-warn">¡Juega hoy para no perderla!</div>}
    </div>
  );
}
