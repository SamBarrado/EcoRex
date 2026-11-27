import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Achievement } from "./achievements";
import { usePlayer } from "./PlayerContext";

// Queue of achievements. Banners stack at the top and fade on their own; medals
// are full-screen moments shown one at a time. `announce` resolves once its
// medals have been dismissed, so a screen can wait for them before moving on
// (e.g. Percibir only goes to the EcoDex after the "new species" medal).
// Banners wait while a full-screen moment (medal, level-up) is open and then run
// their whole time, so none of them fades out unseen behind it.

const BANNER_MS = 3700;
const BANNER_EXIT_MS = 330;
const MAX_BANNERS = 3;

interface AchievementsValue {
  announce: (list: Achievement[]) => Promise<void>;
  /** Declares a full-screen moment open; the returned function closes it. */
  coverScreen: () => () => void;
  /** A full-screen moment (medal, level-up) is open. */
  covered: boolean;
  /** Covered, or achievement banners still on screen: other notices should wait. */
  busy: boolean;
}

// Outside a provider (component tests) announcing is a no-op that resolves at once.
const AchievementsContext = createContext<AchievementsValue>({
  announce: () => Promise.resolve(),
  coverScreen: () => () => {},
  covered: false,
  busy: false,
});

interface LiveBanner {
  key: number;
  achievement: Achievement;
  leaving: boolean;
}

interface QueuedMedal {
  key: number;
  achievement: Achievement;
  resolve: () => void;
}

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { pulse } = usePlayer();
  const [banners, setBanners] = useState<LiveBanner[]>([]);
  const [medals, setMedals] = useState<QueuedMedal[]>([]);
  const keyRef = useRef(0);
  // Mirror of `medals` readable synchronously, so dismissing never resolves
  // from inside a state updater (StrictMode runs those twice) nor twice on a double tap.
  const medalsRef = useRef<QueuedMedal[]>([]);
  const [covers, setCovers] = useState(0);

  const coverScreen = useCallback(() => {
    setCovers((n) => n + 1);
    return () => setCovers((n) => n - 1);
  }, []);

  const leave = useCallback((key: number) => {
    setBanners((prev) => prev.map((b) => (b.key === key ? { ...b, leaving: true } : b)));
    setTimeout(() => setBanners((prev) => prev.filter((b) => b.key !== key)), BANNER_EXIT_MS);
  }, []);

  const announce = useCallback(
    (list: Achievement[]) => {
      if (list.length === 0) return Promise.resolve();
      pulse(list[0].color);
      const newBanners = list.filter((a) => a.kind === "banner").map((achievement) => ({ key: ++keyRef.current, achievement, leaving: false }));
      if (newBanners.length > 0) setBanners((prev) => [...prev, ...newBanners].slice(-MAX_BANNERS));
      const medalList = list.filter((a) => a.kind === "medal");
      if (medalList.length === 0) return Promise.resolve();
      return new Promise<void>((resolveAll) => {
        let remaining = medalList.length;
        const queued = medalList.map((achievement) => ({
          key: ++keyRef.current,
          achievement,
          resolve: () => {
            remaining -= 1;
            if (remaining === 0) resolveAll();
          },
        }));
        medalsRef.current = [...medalsRef.current, ...queued];
        setMedals(medalsRef.current);
      });
    },
    [pulse],
  );

  const dismissMedal = useCallback(() => {
    const [current, ...rest] = medalsRef.current;
    if (!current) return;
    medalsRef.current = rest;
    setMedals(rest);
    current.resolve();
  }, []);

  const medal = medals[0];
  const covered = covers > 0 || medals.length > 0;
  const busy = covered || banners.length > 0;
  const value = useMemo(() => ({ announce, coverScreen, covered, busy }), [announce, coverScreen, covered, busy]);

  return (
    <AchievementsContext.Provider value={value}>
      {children}
      {!covered && banners.length > 0 && (
        <div className="ach-banners" role="status">
          {banners.map((b, i) => (
            <AchievementBanner key={b.key} banner={b} stack={i} onDone={leave} />
          ))}
        </div>
      )}
      {medal && <AchievementMedal key={medal.key} achievement={medal.achievement} onClose={dismissMedal} />}
    </AchievementsContext.Provider>
  );
}

function AchievementBanner({ banner, stack, onDone }: { banner: LiveBanner; stack: number; onDone: (key: number) => void }) {
  const { achievement: a, key, leaving } = banner;
  useEffect(() => {
    const timer = setTimeout(() => onDone(key), BANNER_MS);
    return () => clearTimeout(timer);
  }, [key, onDone]);

  return (
    <div
      className={`ach-banner${leaving ? " ach-banner-out" : ""}`}
      style={{ "--c": a.color, "--stack": stack } as React.CSSProperties}
      onClick={() => onDone(key)}
    >
      <div className="ach-banner-icon" aria-hidden="true">{a.icon}</div>
      <div className="ach-banner-text">
        <b>{a.title}</b>
        <span>{a.subtitle}</span>
      </div>
      {a.xp ? <span className="ach-chip">+{a.xp} XP</span> : null}
    </div>
  );
}

function AchievementMedal({ achievement: a, onClose }: { achievement: Achievement; onClose: () => void }) {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return; // StrictMode runs effects twice
    shown.current = true;
    a.onShow?.();
  }, [a]);

  useLayoutEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className={`ach-medal-ov${a.variant ? ` ach-${a.variant}` : ""}`}
      style={{ "--c": a.color } as React.CSSProperties}
      role="dialog"
      aria-label={a.title}
      onClick={onClose}
    >
      <div className="ach-medal" aria-hidden="true">{a.icon}</div>
      <h3>{a.title}</h3>
      <p>{a.subtitle}</p>
      <div className="ach-tap">Toca para continuar</div>
    </div>
  );
}

export function useAchievements(): AchievementsValue {
  return useContext(AchievementsContext);
}

/** For full-screen moments outside this provider's own medals: holds banners while mounted. */
export function useCoverScreen() {
  const { coverScreen } = useAchievements();
  useLayoutEffect(() => coverScreen(), [coverScreen]);
}
