import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Achievement } from "./achievements";
import { usePlayer } from "./PlayerContext";

// Queue of achievements. Banners stack at the top and fade on their own; medals
// are full-screen moments shown one at a time. `announce` resolves once its
// medals have been dismissed, so a screen can wait for them before moving on
// (e.g. Percibir only goes to the EcoDex after the "new species" medal).

const BANNER_MS = 3700;
const BANNER_EXIT_MS = 330;
const MAX_BANNERS = 3;

interface AchievementsValue {
  announce: (list: Achievement[]) => Promise<void>;
}

// Outside a provider (component tests) announcing is a no-op that resolves at once.
const AchievementsContext = createContext<AchievementsValue>({ announce: () => Promise.resolve() });

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

  const value = useMemo(() => ({ announce }), [announce]);
  const medal = medals[0];

  return (
    <AchievementsContext.Provider value={value}>
      {children}
      {banners.length > 0 && (
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
