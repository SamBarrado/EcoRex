import { useEffect } from "react";

const DISPLAY_MS = 2500;

export function XpToast({ xpGained, note, onDone }: { xpGained: number; note?: string; onDone: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return (
    <div className="xp-toast" role="status">
      +{xpGained} XP{note ? ` · ${note}` : ""}
    </div>
  );
}
