import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getMyProfile, getEnergy, EnergyState } from "./api";

// Shared, always-fresh snapshot of the player's progress (level, XP into the
// level) and energy. The level indicator and the living background need it on
// every screen, so it is fetched here once instead of by each page. Pages that
// change the numbers (a discovery, a fusion) call `refresh()`.

export interface PlayerProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
}

/** A one-shot "something good just happened" signal the background reacts to. */
export interface AtmosphereHit {
  id: number;
  color: string;
}

interface PlayerValue {
  progress: PlayerProgress | null;
  energy: EnergyState | null;
  hit: AtmosphereHit | null;
  refresh: () => void;
  /** Flash the background (XP gained, level up, achievement). */
  pulse: (color?: string) => void;
}

// Outside a provider (component tests, isolated renders) everything is a no-op
// instead of throwing: the rest of the app must never depend on this context.
const NOOP_VALUE: PlayerValue = { progress: null, energy: null, hit: null, refresh: () => {}, pulse: () => {} };

const PlayerContext = createContext<PlayerValue>(NOOP_VALUE);

export const DEFAULT_PULSE_COLOR = "hsl(160 75% 58%)";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [hit, setHit] = useState<AtmosphereHit | null>(null);
  const hitId = useRef(0);

  const refresh = useCallback(() => {
    // 401 (logged out / auth screens) simply leaves the snapshot empty.
    getMyProfile()
      .then((p) => setProgress({ level: p.level, xpIntoLevel: p.xpIntoLevel, xpForNextLevel: p.xpForNextLevel }))
      .catch(() => setProgress(null));
    getEnergy()
      .then(setEnergy)
      .catch(() => setEnergy(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  const pulse = useCallback((color: string = DEFAULT_PULSE_COLOR) => {
    hitId.current += 1;
    setHit({ id: hitId.current, color });
  }, []);

  const value = useMemo(() => ({ progress, energy, hit, refresh, pulse }), [progress, energy, hit, refresh, pulse]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue {
  return useContext(PlayerContext);
}
