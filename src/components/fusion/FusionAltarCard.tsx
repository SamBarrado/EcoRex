import type { EligibleSpecies } from "../../lib/api";
import { FusionSpeciesRow } from "./FusionSpeciesRow";

// The Fusion Altar on Home (design chosen 2026-11-25): one card instead of a
// banner plus a separate "next fusion" card. When something is ready to fuse the
// card glows with embers and a gold outline; otherwise it shows the species that
// is closest to being ready.

export function FusionAltarCard({
  eligible,
  next,
  threshold,
  onFuse,
}: {
  eligible: EligibleSpecies[];
  next: EligibleSpecies | undefined;
  threshold: number;
  /** Open the Altar; with a species id it opens straight onto that fusion. */
  onFuse: (speciesId?: number) => void;
}) {
  const active = eligible.length > 0;
  const first = eligible[0];
  const subtitle = active
    ? eligible.length === 1
      ? "1 especie lista para fusionar"
      : `${eligible.length} especies listas para fusionar`
    : next
      ? "Aún no hay fusiones listas"
      : `Junta ${threshold} cartas Balance de una especie para fusionarlas`;

  return (
    <div className={`card fusion-card${active ? " is-active" : ""}`}>
      {active && <div className="fusion-card-glow" aria-hidden="true" />}
      <button className="fusion-card-head" onClick={() => onFuse()} aria-label="Abrir el Altar de Fusión">
        <img src="/icons/altar-fusion.webp" alt="" draggable={false} />
        <span>
          <strong>Altar de Fusión</strong>
          <span>{subtitle}</span>
        </span>
        <span className="fusion-card-go" aria-hidden="true">›</span>
      </button>
      {first && (
        <FusionSpeciesRow
          species={first}
          threshold={threshold}
          ready
          trailing={<button onClick={() => onFuse(first.speciesId)}>Fusionar</button>}
        />
      )}
      {next && (
        <FusionSpeciesRow
          species={next}
          threshold={threshold}
          trailing={<em>Falta {Math.max(0, threshold - next.balanceCount)}</em>}
        />
      )}
    </div>
  );
}
