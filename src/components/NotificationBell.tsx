import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markNotificationRead, AppNotification } from "../lib/api";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getNotifications()
      .then((data) => setNotifications(data.notifications))
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleClick(notification: AppNotification) {
    await markNotificationRead(notification.id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setOpen(false);
    if (notification.type === "fusion_ready") {
      const payload = notification.payload as { speciesId?: number };
      navigate(payload.speciesId ? `/fusion?speciesId=${payload.speciesId}` : "/fusion");
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} aria-label="Notificaciones">
        🔔{unreadCount > 0 && <span> ({unreadCount})</span>}
      </button>
      {open && (
        <div
          className="card"
          style={{ position: "absolute", right: 0, top: "100%", width: 280, zIndex: 50 }}
        >
          {notifications.length === 0 && <p>Sin notificaciones.</p>}
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{ cursor: "pointer", padding: "0.5rem 0", fontWeight: n.readAt ? 400 : 700 }}
            >
              {n.type === "fusion_ready"
                ? `¡Ya puedes fusionar ${(n.payload as { commonName?: string }).commonName ?? "una especie"}!`
                : n.type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
