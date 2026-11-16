import type { Ref } from "react";
import type { DexSlot, DexSlotRevealed } from "../../lib/api";
import { RARITY_GLOW } from "../../lib/rarityGlow";
import { CardThumb } from "../card/CardThumb";

export interface EcodexTileProps {
  slot: DexSlot;
  /** This slot was just unlocked by a discovery (drives the reveal animation). */
  isJustUnlocked: boolean;
  /** Reveal delay still running: keep showing the locked card on top. */
  revealPending: boolean;
  /** Play the locked-tile shake animation. */
  shaking: boolean;
  tileRef?: Ref<HTMLDivElement>;
  onOpen: (slot: DexSlotRevealed) => void;
  onLockedClick: () => void;
}

export function EcodexTile({ slot, isJustUnlocked, revealPending, shaking, tileRef, onOpen, onLockedClick }: EcodexTileProps) {
  const showAsLocked = slot.locked || (isJustUnlocked && revealPending);

  function activate() {
    if (slot.locked) onLockedClick();
    else onOpen(slot);
  }

  return (
    <div
      className={`card card-clickable ecodex-tile${isJustUnlocked && !revealPending ? " slot-just-unlocked" : ""}${shaking ? " slot-locked-shake" : ""}`}
      ref={tileRef}
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") activate();
      }}
    >
      {!showAsLocked && slot.count > 1 && <span className="ecodex-count-badge">×{slot.count}</span>}
      {isJustUnlocked && !slot.locked ? (
        <div className="slot-reveal-stack">
          <img
            src="/icons/carta-bloqueada.png"
            alt="Carta bloqueada"
            className={`species-image slot-reveal-locked-img${revealPending ? "" : " slot-reveal-hidden"}`}
          />
          <img
            src={slot.image_url}
            alt={slot.common_name}
            className={`species-image slot-reveal-real-img${revealPending ? "" : " slot-reveal-visible"}`}
          />
        </div>
      ) : slot.locked ? (
        <img src="/icons/carta-bloqueada.png" alt="Carta bloqueada" className="species-image ecodex-locked-img" loading="lazy" />
      ) : (
        <>
          <CardThumb
            imageUrl={slot.image_url}
            commonName={slot.common_name}
            scientificName={slot.scientific_name}
            rarityTier={{ slug: slot.rarity_slug, name: slot.rarity_name }}
            fractaeChildName={slot.fractae_child_name}
            glowColor={RARITY_GLOW[slot.rarity_slug] ?? RARITY_GLOW.registrada}
          />
          {slot.lore_phrase && (
            <p className="ecodex-tile-lore" title={slot.lore_phrase}>
              &laquo;{slot.lore_phrase}&raquo;
            </p>
          )}
        </>
      )}
    </div>
  );
}
