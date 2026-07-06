import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getNotifications, markNotificationRead, AppNotification } from "./api";

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
  refetch: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refetch = useCallback(() => {
    getNotifications()
      .then((data) => setNotifications(data.notifications))
      .catch(() => {});
  }, []);

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
    () => ({ notifications, unreadCount, markRead, refetch }),
    [notifications, unreadCount, markRead, refetch]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
