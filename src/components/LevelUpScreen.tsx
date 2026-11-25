import { useLayoutEffect, useMemo } from "react";

// Level-up as a fracture wave (design chosen 2026-11-18): shockwave rings, cracks
// radiating from the new level number and a burst of particles. Pure SVG/CSS.

const CRACK_COUNT = 9;
const PARTICLE_COUNT = 26;

function buildCracks(): string[] {
  return Array.from({ length: CRACK_COUNT }, (_, a) => {
    const angle = (a / CRACK_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    let d = "M170 170";
    let r = 0;
    for (let s = 0; s < 5; s++) {
      r += 22 + Math.random() * 18;
      const jitter = (Math.random() - 0.5) * 0.45;
      d += ` L${(170 + Math.cos(angle + jitter) * r).toFixed(1)} ${(170 + Math.sin(angle + jitter) * r).toFixed(1)}`;
    }
    return d;
  });
}

function buildParticles() {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 170;
    return {
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist),
      size: 3 + Math.random() * 6,
    };
  });
}

export function LevelUpScreen({
  previousLevel,
  level,
  energyGained = 0,
  onClose,
}: {
  previousLevel: number;
  level: number;
  energyGained?: number;
  onClose: () => void;
}) {
  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Random once per mount, so a re-render never reshuffles the cracks mid-animation.
  const cracks = useMemo(buildCracks, []);
  const particles = useMemo(buildParticles, []);

  return (
    <div className="lvfx" onClick={onClose} role="dialog" aria-label={`¡Subiste al nivel ${level}!`}>
      {[260, 420, 600].map((delay) => (
        <i key={delay} className="lvfx-center lvfx-shock" style={{ "--d": `${delay}ms` } as React.CSSProperties} aria-hidden="true" />
      ))}
      <svg className="lvfx-center lvfx-cracks" viewBox="0 0 340 340" aria-hidden="true">
        {cracks.map((d, i) => (
          <path key={i} pathLength={1} d={d} />
        ))}
      </svg>
      {particles.map((p, i) => (
        <i
          key={i}
          className="lvfx-center lvfx-part"
          style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, width: p.size, height: p.size } as React.CSSProperties}
          aria-hidden="true"
        />
      ))}
      <div className="lvfx-num">{level}</div>
      <h3 className="lvfx-title">¡Subiste de nivel!</h3>
      <p className="lvfx-prev">Nivel {previousLevel} › {level}</p>
      {energyGained > 0 && <p className="lvfx-energy">⚡ +{energyGained} de energía</p>}
      <p className="lvfx-hint">Toca para continuar</p>
    </div>
  );
}
