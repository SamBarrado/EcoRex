import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getNotifications, markNotificationRead, AppNotification } from "./api";

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
  refetch: () => void;
  /** The newest notification that arrived while the app was open (not on first load): the bell folds it in. */
  incoming: AppNotification | null;
  clearIncoming: () => void;
}


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
          if (fresh.length > 0) setIncoming(fresh[0]);
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
