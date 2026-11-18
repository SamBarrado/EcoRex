import type { EligibleSpecies } from "../lib/api";

/** "Next fusion": the species closest to the duplicates needed, as a progress bar. */
export function FusionProgressCard({
  species,
  threshold,
  label = "Próxima fusión: ",
}: {
  species: EligibleSpecies | undefined;
  threshold: number;
  label?: string;
}) {
  if (!species) return null;

  const pct = Math.min(100, Math.round((species.balanceCount / threshold) * 100));
  return (
    <div className="card">
      <div className="stat">
        <strong>
          {label}
          {species.commonName}
        </strong>
        <span>
          {species.balanceCount}/{threshold}
        </span>
      </div>
      <div className="level-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={species.balanceCount}>
        <div className="level-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="streak-hint">
        Junta {threshold} cartas Balance de esta especie para obtener su forma Exceso.
      </div>
    </div>
  );
}
