import { useEffect, useRef } from "react";
import { flyOrbs } from "../lib/xpOrbs";

const DISPLAY_MS = 2500;

// "+N XP" pill at the top of the screen. The XP itself travels as glowing orbs
// from the centre of the screen to the level ring; see lib/xpOrbs.
export function XpToast({ xpGained, note, onDone }: { xpGained: number; note?: string; onDone: () => void }) {
  const launched = useRef(false);
  // Screens pass a new `onDone` on every render; it must not restart the timer.
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timeout = setTimeout(() => onDoneRef.current(), DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  // Deliberately no cleanup: the orbs outlive the pill (swiping the card away
  // must not cut them mid-flight). The ref keeps StrictMode from launching twice.
  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    flyOrbs({ amount: xpGained });
  }, [xpGained]);

  return (
    <div className="xp-toast" role="status">
      +{xpGained} XP{note ? ` · ${note}` : ""}
    </div>
  );
}
