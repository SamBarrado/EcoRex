import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getNotifications, markNotificationRead, AppNotification } from "./api";

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    getNotifications()
      .then((data) => setNotifications(data.notifications))
      .catch(() => {});
  }, []);

  const markRead = useCallback(async (id: number) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const value = useMemo(() => ({ notifications, unreadCount, markRead }), [notifications, unreadCount, markRead]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
