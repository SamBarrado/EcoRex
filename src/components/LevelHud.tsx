import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PlayerProgress, usePlayer } from "../lib/PlayerContext";
import { useAchievements } from "../lib/AchievementsContext";
import { onXpFlight } from "../lib/xpOrbs";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useAppNavigate } from "../lib/navigation";

// Level ring (top-right): the player's constant sense of progress and the
// target the XP orbs fly to. It hides with the bottom nav so it never covers an
// immersive moment (the pack ritual, card reveals), except while XP is flying:
// then it peeks over whatever is on screen, fills up as the first orb lands and
// leaves again. Never on the account screens.

const HIDDEN_ON = ["/login", "/registro", "/elegir-usuario", "/privacidad"];
const GAIN_FLASH_MS = 900;
/** How long the filled ring stays after the last orb, and its way out. */
const LINGER_MS = 1200;
const LEAVE_MS = 300;

export default function LevelHud() {
  const { progress } = usePlayer();
  const { visible } = useNavVisibility();
  const { pathname } = useLocation();
  const navigate = useAppNavigate();
  const { covered } = useAchievements();
  const [gain, setGain] = useState(false);
  const previous = useRef<{ level: number; xp: number } | null>(null);
  const [flight, setFlight] = useState<"none" | "flying" | "leaving">("none");
  // The value shown before the orbs arrive, so the ring is seen filling up.
  const [held, setHeld] = useState<PlayerProgress | null>(null);
  const shown = held ?? progress;
  const shownRef = useRef(shown);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const clear = () => timers.forEach(clearTimeout);
    const unsubscribe = onXpFlight(({ firstLandingMs, lastLandingMs }) => {
      clear();
      setHeld((current) => current ?? shownRef.current);
      setFlight("flying");
      timers = [
        setTimeout(() => setHeld(null), firstLandingMs),
        setTimeout(() => setFlight("leaving"), lastLandingMs + LINGER_MS),
        setTimeout(() => setFlight("none"), lastLandingMs + LINGER_MS + LEAVE_MS),
      ];
    });
    return () => {
      unsubscribe();
      clear();
    };
  }, []);

  useEffect(() => {
    if (!shown) return;
    const before = previous.current;
    previous.current = { level: shown.level, xp: shown.xpIntoLevel };
    if (!before || (before.level === shown.level && before.xp === shown.xpIntoLevel)) return;
    setGain(true);
    const timeout = setTimeout(() => setGain(false), GAIN_FLASH_MS);
    return () => clearTimeout(timeout);
  }, [shown]);

  const flying = flight !== "none";
  if (!shown || (!visible && !flying) || HIDDEN_ON.includes(pathname)) return null;

  const { level, xpIntoLevel, xpForNextLevel } = shown;
  const classes = [
    "level-hud",
    gain && "level-hud-gain",
    flying && "level-hud-xp",
    flying && !visible && "level-hud-peek",
    flight === "leaving" && !visible && "level-hud-leaving",
    // Over an immersive screen or a medal it is only there to be seen.
    flying && (!visible || covered) && "level-hud-passive",
  ]
    .filter(Boolean)
    .join(" ");
  const pct = xpForNextLevel ? Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))) : 100;
  const label = xpForNextLevel
    ? `Nivel ${level}, ${xpIntoLevel} de ${xpForNextLevel} XP. Ir a tu perfil`
    : `Nivel ${level}, nivel máximo. Ir a tu perfil`;

  return (
    <button className={classes} data-level-hud onClick={() => navigate("/perfil")} aria-label={label}>
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        <circle cx="22" cy="22" r="19" className="level-hud-track" />
        <circle cx="22" cy="22" r="19" className="level-hud-fill" pathLength="100" style={{ strokeDasharray: `${pct} 100` }} />
      </svg>
      <b>{level}</b>
    </button>
  );
}
