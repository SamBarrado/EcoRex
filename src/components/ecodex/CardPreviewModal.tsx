import { useLayoutEffect } from "react";
import type { DexSlotRevealed } from "../../lib/api";
import { RARITY_GLOW, fractaeIconUrlFromName } from "../../lib/rarityGlow";
import { CardScene } from "../card/CardScene";

export interface CardPreviewModalProps {
  slot: DexSlotRevealed;
  onClose: () => void;
}

// Full-screen card viewer. Locks page scroll while mounted.
export function CardPreviewModal({ slot, onClose }: CardPreviewModalProps) {
  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("card-preview-open");
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("card-preview-open");
    };
  }, []);

  return (
    <div className="card-preview-overlay" onClick={onClose}>
      <div className="card-preview-body" onClick={(e) => e.stopPropagation()}>
        <CardScene
          imageUrl={slot.image_url}
          commonName={slot.common_name}
          scientificName={slot.scientific_name}
          rarityTier={{ slug: slot.rarity_slug, name: slot.rarity_name }}
          fractaeChildName={slot.fractae_child_name}
          fractaeIconUrl={fractaeIconUrlFromName(slot.fractae_child_name)}
          phase={slot.phase}
          lorePhrase={slot.lore_phrase ?? undefined}
          reveal="none"
          glowColor={RARITY_GLOW[slot.rarity_slug] ?? RARITY_GLOW.registrada}
        />
      </div>
      <button className="card-preview-close" onClick={onClose} aria-label="Cerrar">
        Cerrar
      </button>
    </div>
  );
}
