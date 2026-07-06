export function FeatureUnlockModal({
  icon,
  title,
  onClose,
}: {
  icon: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="level-up-backdrop" onClick={onClose}>
      <div className="card level-up-modal" onClick={(e) => e.stopPropagation()}>
        <strong>¡Función desbloqueada!</strong>
        <img src={icon} alt="" style={{ width: 64, height: 64, objectFit: "contain", margin: "0.5rem 0" }} />
        <div className="level-up-number">{title}</div>
        <button onClick={onClose}>Genial</button>
      </div>
    </div>
  );
}
