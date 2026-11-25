import { useEffect, useRef } from "react";
import { flyOrbs } from "../lib/xpOrbs";

const DISPLAY_MS = 2500;

// "+N XP" pill at the top of the screen. The XP itself travels as glowing orbs
// from the pill to the level ring (design chosen 2026-11-18); see lib/xpOrbs.
export function XpToast({ xpGained, note, onDone }: { xpGained: number; note?: string; onDone: () => void }) {
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(onDone, DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  useEffect(() => {
    if (!pillRef.current) return;
    return flyOrbs({ from: pillRef.current, amount: xpGained });
  }, [xpGained]);

  return (
    <div className="xp-toast" role="status" ref={pillRef}>
      +{xpGained} XP{note ? ` · ${note}` : ""}
    </div>
  );
}
