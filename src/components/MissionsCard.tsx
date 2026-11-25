import { MissionsState } from "../lib/api";

export interface MissionsCardProps {
  missions: MissionsState | null;
}

export function MissionsCard({ missions }: MissionsCardProps) {
  if (!missions) return null;

  return (
    <div className="card">
      <strong>Misiones de hoy</strong>
      <ul className="home-missions">
        {missions.missions.map((mission) => (
          <li key={mission.slug} className={`${mission.completed ? "done" : ""}${mission.optional ? " extra" : ""}`.trim() || undefined}>
            <i aria-hidden="true">{mission.completed ? "✓" : ""}</i>
            <span>
              {mission.label}
              {mission.completed && <span className="sr-only"> (completada)</span>}
            </span>
            <em>
              {Math.min(mission.progress, mission.target)}/{mission.target}
            </em>
          </li>
        ))}
      </ul>
      <div className={`home-bonus${missions.bonus.completed ? " done" : ""}`}>
        <span>
          {missions.bonus.completed ? "✓ " : "🎁 "}Bonus del día
        </span>
        <span>+{missions.bonus.xp} XP</span>
      </div>
      <div className="home-bonus-hint">Se logra al completar las misiones principales (las «extra» no cuentan).</div>
    </div>
  );
}
