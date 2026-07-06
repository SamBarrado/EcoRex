export function LevelUpScreen({
  previousLevel,
  level,
  onClose,
}: {
  previousLevel: number;
  level: number;
  onClose: () => void;
}) {
  return (
    <div className="level-up-screen" onClick={onClose}>
      <div className="level-up-screen-top">
        <strong className="level-up-screen-title">¡Subiste de nivel!</strong>
        <img src="/logo/logo-ecorex.png" alt="" className="level-up-screen-avatar" />
      </div>
      <div className="level-up-screen-bottom">
        <div className="level-up-screen-levels">
          <span className="level-up-screen-level-prev">Nivel {previousLevel}</span>
          <span className="level-up-screen-arrow">›</span>
          <span className="level-up-screen-level-new">{level}</span>
        </div>
        <p className="level-up-screen-hint">Toca para continuar</p>
      </div>
    </div>
  );
}
