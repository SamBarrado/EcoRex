const PHASES = ["balance", "exceso", "eco"] as const;

export interface PhaseFilterProps {
  /** Active phase, or null for "Todas". */
  value: string | null;
  onChange: (phase: string | null) => void;
}

export function PhaseFilter({ value, onChange }: PhaseFilterProps) {
  return (
    <div className="phase-filter">
      <button
        className={`phase-filter-btn${value === null ? " is-active" : ""}`}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        Todas
      </button>
      {PHASES.map((phase) => (
        <button
          key={phase}
          className={`phase-filter-btn${value === phase ? " is-active" : ""}`}
          aria-pressed={value === phase}
          onClick={() => onChange(phase)}
        >
          {phase}
        </button>
      ))}
    </div>
  );
}
