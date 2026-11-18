import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePlayer } from "../lib/PlayerContext";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useAppNavigate } from "../lib/navigation";

// Always-visible level ring (top-right). It is the target the XP orbs fly to
// (design chosen 2026-11-18) and the player's constant sense of progress. It
// hides with the bottom nav so it never covers an immersive moment (the pack
// ritual, card reveals) and on the account screens.

const HIDDEN_ON = ["/login", "/registro", "/elegir-usuario", "/privacidad"];
const GAIN_FLASH_MS = 900;

export default function LevelHud() {
  const { progress } = usePlayer();
  const { visible } = useNavVisibility();
  const { pathname } = useLocation();
  const navigate = useAppNavigate();
  const [gain, setGain] = useState(false);
  const previous = useRef<{ level: number; xp: number } | null>(null);

  useEffect(() => {
    if (!progress) return;
    const before = previous.current;
    previous.current = { level: progress.level, xp: progress.xpIntoLevel };
    if (!before || (before.level === progress.level && before.xp === progress.xpIntoLevel)) return;
    setGain(true);
    const timeout = setTimeout(() => setGain(false), GAIN_FLASH_MS);
    return () => clearTimeout(timeout);
  }, [progress]);

  if (!progress || !visible || HIDDEN_ON.includes(pathname)) return null;

  const { level, xpIntoLevel, xpForNextLevel } = progress;
  const pct = xpForNextLevel ? Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))) : 100;
  const label = xpForNextLevel
    ? `Nivel ${level}, ${xpIntoLevel} de ${xpForNextLevel} XP. Ir a tu perfil`
    : `Nivel ${level}, nivel máximo. Ir a tu perfil`;

  return (
    <button className={`level-hud${gain ? " level-hud-gain" : ""}`} data-level-hud onClick={() => navigate("/perfil")} aria-label={label}>
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        <circle cx="22" cy="22" r="19" className="level-hud-track" />
        <circle cx="22" cy="22" r="19" className="level-hud-fill" pathLength="100" style={{ strokeDasharray: `${pct} 100` }} />
      </svg>
      <b>{level}</b>
    </button>
  );
}
