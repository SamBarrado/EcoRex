import { useMemo } from "react";

const PARTICLE_COUNT = 16;

export default function BackgroundFx() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 5,
        duration: 14 + Math.random() * 12,
        delay: Math.random() * -20,
        drift: (Math.random() - 0.5) * 60,
      })),
    []
  );

  return (
    <div className="bg-fx" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="bg-particle"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
