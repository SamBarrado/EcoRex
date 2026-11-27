import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";
import { claimOnboarding, getOnboarding, OnboardingState } from "./api";
import { FIRST_STEPS_ACHIEVEMENT } from "./achievements";
import { useAchievements } from "./AchievementsContext";
import { useNotifications } from "./NotificationsContext";
import { usePlayer } from "./PlayerContext";
import { flyOrbs } from "./xpOrbs";
import { LevelUpScreen } from "../components/LevelUpScreen";

// "Primeros pasos" lives in the shell so the prize is collected and celebrated
// right where the last step is done (Percibir, EcoDex, Perfil or Inicio). The
// server re-checks every step and pays once.

interface OnboardingValue {
  /**
   * Reads the checklist and, with every step done, collects and celebrates the
   * prize. Resolves with what it read, or null if it could not be read or there
   * was nothing left to ask. `fresh` reads even then (another account may have
   * signed in).
   */
  check: (options?: { fresh?: boolean }) => Promise<OnboardingState | null>;
  /** Prizes paid in this session: screens showing XP or energy reload when it grows. */
  paid: number;
}

// Outside a provider (component tests) there is nothing to check.
const OnboardingContext = createContext<OnboardingValue>({ check: () => Promise.resolve(null), paid: 0 });

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { announce } = useAchievements();
  const { refetch: refetchNotifications } = useNotifications();
  const { refresh: refreshPlayer } = usePlayer();
  const [paid, setPaid] = useState(0);
  const [levelUp, setLevelUp] = useState<{ previousLevel: number; level: number } | null>(null);
  /** The account has nothing left to collect: later actions do not need to ask. */
  const settled = useRef(false);
  /** Checks run one after another, so two actions at once never claim twice. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const celebrate = useCallback(
    (xp: Awaited<ReturnType<typeof claimOnboarding>>["xp"]) => {
      setPaid((n) => n + 1);
      refetchNotifications();
      const prize = {
        ...FIRST_STEPS_ACHIEVEMENT,
        // The XP travels when the medal is really on screen, and the level ring
        // is refreshed then, so it is seen filling up.
        onShow: () => {
          if (xp && xp.xpGained > 0) flyOrbs({ amount: xp.xpGained });
          refreshPlayer();
        },
      };
      void announce([prize]).then(() => {
        if (xp?.leveledUp) setLevelUp({ previousLevel: xp.previousLevel, level: xp.level });
      });
    },
    [announce, refetchNotifications, refreshPlayer],
  );

  const check = useCallback(
    (options?: { fresh?: boolean }) => {
      async function run(): Promise<OnboardingState | null> {
        if (settled.current && !options?.fresh) return null;
        const state = await getOnboarding();
        settled.current = !state.eligible || state.rewardClaimed;
        if (settled.current || !state.steps.every((s) => s.done)) return state;
        // If collecting fails the state still stands; the next check retries.
        const claim = await claimOnboarding().catch(() => null);
        if (!claim?.claimed) return state;
        settled.current = true;
        celebrate(claim.xp);
        return { ...state, rewardClaimed: true };
      }
      const next = queue.current.then(run).catch(() => null);
      queue.current = next;
      return next;
    },
    [celebrate],
  );

  const value = useMemo(() => ({ check, paid }), [check, paid]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {levelUp && <LevelUpScreen previousLevel={levelUp.previousLevel} level={levelUp.level} onClose={() => setLevelUp(null)} />}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingValue {
  return useContext(OnboardingContext);
}
