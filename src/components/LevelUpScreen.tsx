import { useLayoutEffect } from "react";

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

  return (
    <div className="level-up-screen" onClick={onClose}>
      <div className="level-up-screen-top">
        <strong className="level-up-screen-title">¡Subiste de nivel!</strong>
        <img src="/logo/logo-ecorex.webp" alt="" className="level-up-screen-avatar" />
      </div>
      <div className="level-up-screen-bottom">
        <div className="level-up-screen-levels">
          <span className="level-up-screen-level-prev">Nivel {previousLevel}</span>
          <span className="level-up-screen-arrow">›</span>
          <span className="level-up-screen-level-new">{level}</span>
        </div>
        {energyGained > 0 && <p className="level-up-screen-energy">⚡ +{energyGained} de energía</p>}
        <p className="level-up-screen-hint">Toca para continuar</p>
      </div>
    </div>
  );
}
