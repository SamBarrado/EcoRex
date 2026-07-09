const CARD_BACK_PATH = "/card-back.png";

export interface CardProps {
  facing: "front" | "back";
  rotateY: number;
  transition: string;
  imageUrl: string;
  commonName: string;
  scientificName: string;
  rarityTier: { slug: string; name: string };
  fractaeChildName?: string;
  fractaeIconUrl?: string;
  lorePhrase?: string;
  glowColor: string;
  auraOpacity: number;
}

export function Card({
  facing,
  rotateY,
  transition,
  imageUrl,
  commonName,
  scientificName,
  rarityTier,
  fractaeChildName,
  fractaeIconUrl,
  lorePhrase,
  glowColor,
  auraOpacity,
}: CardProps) {
  return (
    <div className="card-flipper" style={{ transform: `rotateY(${rotateY}deg)`, transition }}>
      <div className="card-face card-face-front" data-testid="card-front">
        <div className="card-layer-bg" />
        <div
          className="card-layer-aura"
          data-testid="card-aura"
          style={{
            opacity: auraOpacity,
            background: `radial-gradient(circle at 50% 42%, ${glowColor}, transparent 65%)`,
          }}
        />
        <div className="card-art-window">
          <img src={imageUrl} alt={commonName} className="card-art-image" draggable={false} />
        </div>
        {fractaeIconUrl && (
          <div className="card-fractae-badge">
            <img
              src={fractaeIconUrl}
              alt={fractaeChildName ? `Fractae: ${fractaeChildName}` : "Fractae"}
              draggable={false}
            />
          </div>
        )}
        <div className="card-nameplate">
          <div className="card-nameplate-row">
            <span className="card-name">{commonName}</span>
            <span className="card-rarity-pill" style={{ boxShadow: `0 0 8px ${glowColor}` }}>
              {rarityTier.name}
            </span>
          </div>
          <span className="card-scientific-name">{scientificName}</span>
        </div>
        <div className="card-textbox">
          {fractaeChildName && <div className="card-fractae-row">Fractae: {fractaeChildName}</div>}
          {lorePhrase && <em className="card-lore-phrase">&laquo;{lorePhrase}&raquo;</em>}
        </div>
        <div className="card-border" />
        <div className="card-corner-stud card-corner-stud-tl" />
        <div className="card-corner-stud card-corner-stud-tr" />
        <div className="card-corner-stud card-corner-stud-bl" />
        <div className="card-corner-stud card-corner-stud-br" />
      </div>
      <div
        className="card-face card-face-back"
        style={{ visibility: facing === "back" ? "visible" : "hidden" }}
      >
        <img src={CARD_BACK_PATH} alt="Ecorex" className="card-back-image" draggable={false} />
      </div>
      <div className="card-edge card-edge-left" />
      <div className="card-edge card-edge-right" />
    </div>
  );
}
