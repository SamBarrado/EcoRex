export function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <div className="level-up-backdrop" onClick={onClose}>
      <div className="card level-up-modal" onClick={(e) => e.stopPropagation()}>
        <strong>¡Subiste de nivel!</strong>
        <div className="level-up-number">Nivel {level}</div>
        <button onClick={onClose}>Genial</button>
      </div>
    </div>
  );
}
