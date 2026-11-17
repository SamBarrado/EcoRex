import type { CSSProperties, Ref } from "react";
import { rarityTierIndex, shortRarityName } from "../../lib/rarityGlow";

const CARD_BACK_PATH = "/card-back.webp";

// The card is a thin solid slab: a front face, a back face and a stack of
// rounded slices between them that read as the card's edge when it turns.
// Same corner radius everywhere, so the three never show a gap.
const SLICE_COUNT = 9;
const SLICE_STEP_PX = 0.5625;

export interface CardProps {
  imageUrl: string;
  commonName: string;
  scientificName: string;
  rarityTier: { slug: string; name: string };
  fractaeChildName?: string;
  fractaeIconUrl?: string;
  lorePhrase?: string;
  /** Species phase slug ("balance" | "exceso" | "eco"), shown next to the rarity. */
  phase?: string;
  glowColor: string;
  /**
   * While true the card shows its back over the front (the "Barrido" reveal
   * starts like this, so the front is never visible before it is uncovered).
   */
  covered?: boolean;
  flipperRef?: Ref<HTMLDivElement>;
}

export function Card({
  imageUrl,
  commonName,
  scientificName,
  rarityTier,
  fractaeChildName,
  fractaeIconUrl,
  lorePhrase,
  phase,
  glowColor,
  covered = false,
  flipperRef,
}: CardProps) {
  const tier = rarityTierIndex(rarityTier.slug);
  const edgeColor = `color-mix(in srgb, ${glowColor} 28%, #2d2b22)`;
  const style = { "--rc": glowColor, "--edge": edgeColor } as CSSProperties;

  return (
    <div className="card-flipper" ref={flipperRef} style={style}>
      <div className={`card-face card-face-front card-r${tier}`} data-testid="card-front">
        <div className="card-fc">
          <div className="card-frame">
            <div className="card-inner">
              <div className="card-nm">
                {fractaeIconUrl && (
                  <div className="card-medal">
                    <img
                      src={fractaeIconUrl}
                      alt={fractaeChildName ? `Fractae: ${fractaeChildName}` : "Fractae"}
                      draggable={false}
                    />
                  </div>
                )}
                <div className="card-titles">
                  <h3 className="card-name">{commonName}</h3>
                  <p className="card-scientific-name">{scientificName}</p>
                </div>
              </div>
              <div className="card-art">
                <img src={imageUrl} alt={commonName} draggable={false} />
              </div>
              <div className="card-mid">
                <span className="card-rar">
                  <span className="card-pips" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <i key={i} className={i <= tier ? "on" : ""} />
                    ))}
                  </span>
                  <span className="card-rarity-pill">{shortRarityName(rarityTier.name)}</span>
                </span>
                {phase && <span className="card-phase">{phase}</span>}
              </div>
              {lorePhrase && <p className="card-lore-phrase">&laquo;{lorePhrase}&raquo;</p>}
              <div className="card-ft">
                <span>{fractaeChildName ? `Fractae · ${fractaeChildName}` : ""}</span>
                <span>Ecorex</span>
              </div>
            </div>
          </div>
          <div className="card-foil" />
          <div className="card-glare" />
          <div className="card-spark" />
        </div>
        {covered && (
          <>
            <div className="card-veil" data-testid="card-veil" />
            <div className="card-scanline" />
          </>
        )}
        <div className="card-sweep" />
      </div>
      <div className="card-face card-face-back">
        <img src={CARD_BACK_PATH} alt="Ecorex" className="card-back-image" draggable={false} />
      </div>
      {Array.from({ length: SLICE_COUNT }, (_, i) => (
        <div
          key={i}
          className="card-slice"
          style={{ transform: `translateZ(${((i - (SLICE_COUNT - 1) / 2) * SLICE_STEP_PX).toFixed(3)}px)` }}
        />
      ))}
    </div>
  );
}
