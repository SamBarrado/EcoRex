import type { ReactNode } from "react";
import type { EligibleSpecies } from "../../lib/api";

// One species at the Fusion Altar: thumbnail, name and a row of slots showing how
// many Balance cards are gathered (design chosen 2026-11-25). Used by the Home
// altar card and by the Altar screen, so both read the same.

export function FusionPips({ count, total }: { count: number; total: number }) {
  return (
    <span className="fusion-pips" role="img" aria-label={`${Math.min(count, total)} de ${total} cartas Balance`}>
      {Array.from({ length: total }, (_, k) => (
        <i key={k} className={k < count ? "on" : undefined} />
      ))}
    </span>
  );
}

export function FusionSpeciesRow({
  species,
  threshold,
  ready = false,
  big = false,
  trailing,
  highlighted = false,
}: {
  species: EligibleSpecies;
  threshold: number;
  ready?: boolean;
  big?: boolean;
  /** Right-hand side: a button for a ready species, a counter for one in progress. */
  trailing?: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className={`fusion-row${ready ? " ready" : ""}${highlighted ? " highlighted" : ""}`}>
      <img className={`fusion-th${big ? " big" : ""}`} src={species.balanceAnchorUrl} alt="" loading="lazy" draggable={false} />
      <div className="fusion-mid">
        <b>{species.commonName}</b>
        <FusionPips count={species.balanceCount} total={threshold} />
        {ready && <small>{species.balanceCount} cartas Balance</small>}
      </div>
      {trailing}
    </div>
  );
}
