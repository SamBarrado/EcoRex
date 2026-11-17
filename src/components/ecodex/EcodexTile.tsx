import type { CSSProperties, Ref } from "react";
import type { DexSlot, DexSlotRevealed } from "../../lib/api";
import { RARITY_GLOW, fractaeIconUrlFromName, rarityTierIndex, shortRarityName } from "../../lib/rarityGlow";

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

function LockedTile() {
  return (
    <div className="ecodex-tile ecodex-tile-locked">
      <img src="/icons/carta-bloqueada.png" alt="Carta bloqueada" className="ecodex-tile-locked-img" loading="lazy" draggable={false} />
    </div>
  );
}

function RevealedTile({ slot }: { slot: DexSlotRevealed }) {
  const tier = rarityTierIndex(slot.rarity_slug);
  const iconUrl = fractaeIconUrlFromName(slot.fractae_child_name);
  return (
    <div className={`ecodex-tile tile-r${tier}`}>
      <div className="ecodex-tile-art">
        <img src={slot.image_url} alt={slot.common_name} loading="lazy" draggable={false} />
      </div>
      {iconUrl && (
        <span className="ecodex-tile-medal">
          <img src={iconUrl} alt={`Fractae: ${slot.fractae_child_name}`} draggable={false} />
        </span>
      )}
      {slot.count > 1 && <span className="ecodex-count-badge">×{slot.count}</span>}
      <div className="ecodex-tile-info">
        <b className="ecodex-tile-name">{slot.common_name}</b>
        <span className="ecodex-tile-rarity">
          <span className="ecodex-tile-pips" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={i <= tier ? "on" : ""} />
            ))}
          </span>
          {shortRarityName(slot.rarity_name)}
        </span>
      </div>
      <div className="ecodex-tile-fx" />
    </div>
  );
}

export function EcodexTile({ slot, isJustUnlocked, revealPending, shaking, tileRef, onOpen, onLockedClick }: EcodexTileProps) {
  const showAsLocked = slot.locked || (isJustUnlocked && revealPending);

  function activate() {
    if (slot.locked) onLockedClick();
    else onOpen(slot);
  }

  const color = !slot.locked ? (RARITY_GLOW[slot.rarity_slug] ?? RARITY_GLOW.registrada) : undefined;
  // Stagger the idle glints so the grid does not flash in unison.
  const style = (slot.locked ? {} : { "--rc": color, "--glint-delay": `${(slot.species_id * 1.3) % 4.8}s` }) as CSSProperties;

  return (
    <div
      className={`ecodex-slot card-clickable${isJustUnlocked && !revealPending ? " slot-just-unlocked" : ""}${shaking ? " slot-locked-shake" : ""}`}
      style={style}
      ref={tileRef}
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") activate();
      }}
    >
      {showAsLocked || slot.locked ? <LockedTile /> : <RevealedTile slot={slot} />}
      {!showAsLocked && !slot.locked && slot.lore_phrase && (
        <p className="ecodex-tile-lore" title={slot.lore_phrase}>
          &laquo;{slot.lore_phrase}&raquo;
        </p>
      )}
    </div>
  );
}
