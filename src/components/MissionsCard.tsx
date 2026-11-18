import { MissionsState } from "../lib/api";

export interface MissionsCardProps {
  missions: MissionsState | null;
}

export function MissionsCard({ missions }: MissionsCardProps) {
  if (!missions) return null;

  return (
    <div className="card">
      <strong>Misiones de hoy</strong>
      {missions.missions.map((mission) => (
        <div className="stat" key={mission.slug}>
          <span>
            {mission.completed ? "✓ " : ""}
            {mission.label}
          </span>
          <span>
            {Math.min(mission.progress, mission.target)}/{mission.target}
          </span>
        </div>
      ))}
      <div className="stat">
        <span>
          {missions.bonus.completed ? "✓ " : ""}
          Bonus: completa las misiones principales
        </span>
        <span>+{missions.bonus.xp} XP</span>
      </div>
    </div>
  );
}
