import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getNotifications, markNotificationRead, AppNotification } from "./api";

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
  refetch: () => void;
  /** A notification that arrived while the app was open (not on first load) and the bell has not announced yet. */
  incoming: AppNotification | null;
  clearIncoming: () => void;
}

// These already have their own moment on screen (level-up screen, streak
// banner): the bell only rings for them.
export const QUIET_TYPES = new Set(["level_up", "streak_reward"]);

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [incoming, setIncoming] = useState<AppNotification | null>(null);
  // Ids already shown to the player. `null` until the first successful load, so
  // what was already waiting when the app opened is not announced as "new".
  const seenIds = useRef<Set<number> | null>(null);

  const refetch = useCallback(() => {
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        const seen = seenIds.current;
        if (seen) {
          const fresh = data.notifications.filter((n) => !seen.has(n.id));
          // One with a banner wins over ring-only ones, now and while it waits
          // for the bell; it is dropped if it stops being unread meanwhile.
          const best = fresh.find((n) => !QUIET_TYPES.has(n.type)) ?? fresh[0] ?? null;
          setIncoming((pending) => {
            const waiting = pending && data.notifications.some((n) => n.id === pending.id) ? pending : null;
            if (!best) return waiting;
            return waiting && QUIET_TYPES.has(best.type) && !QUIET_TYPES.has(waiting.type) ? waiting : best;
          });
        }
        seenIds.current = new Set([...(seen ?? []), ...data.notifications.map((n) => n.id)]);
      })
      .catch(() => {});
  }, []);

  const clearIncoming = useCallback(() => setIncoming(null), []);

  useEffect(() => {
    // The push cron creates notifications server-side while the app sits in the
    // background; coming back to it is when the player should see them. (No
    // polling: it would keep a timer alive for nothing and drain battery.)
    function onVisible() {
      if (document.visibilityState === "visible") refetch();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  useEffect(() => {
    refetch();
    // Server-side actions on other pages (a Percibir discovery unlocking
    // fusion, a fuse clearing its own reminder) can change the unread set
    // without this provider knowing — re-sync every time the route changes.
  }, [refetch, location.pathname]);

  const markRead = useCallback(async (id: number) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.length;

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, refetch, incoming, clearIncoming }),
    [notifications, unreadCount, markRead, refetch, incoming, clearIncoming]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
