import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markNotificationRead, AppNotification } from "../lib/api";
import { LevelUpModal } from "./LevelUpModal";

export default function ActionFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showList, setShowList] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

  useEffect(() => {
    getNotifications()
      .then((data) => setNotifications(data.notifications))
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  function closeAll() {
    setOpen(false);
    setShowList(false);
  }

  async function handleNotificationClick(notification: AppNotification) {
    await markNotificationRead(notification.id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    closeAll();
    if (notification.type === "fusion_ready") {
      const payload = notification.payload as { speciesId?: number };
      navigate(payload.speciesId ? `/fusion?speciesId=${payload.speciesId}` : "/fusion");
    }
    if (notification.type === "level_up") {
      const payload = notification.payload as { newLevel?: number };
      if (payload.newLevel) {
        setLevelUpTo(payload.newLevel);
      }
      return;
    }
  }

  return (
    <div className="action-fab-container">
      {open && (
        <div className="action-fab-backdrop" onClick={closeAll} />
      )}
      {showList && (
        <div className="card action-fab-notif-list" onClick={(e) => e.stopPropagation()}>
          {notifications.length === 0 && <p>Sin notificaciones.</p>}
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card-clickable truncate"
              role="button"
              tabIndex={0}
              onClick={() => handleNotificationClick(n)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNotificationClick(n)}
              style={{ padding: "0.5rem 0", fontWeight: n.readAt ? 400 : 700 }}
            >
              {n.type === "fusion_ready"
                ? `¡Ya puedes fusionar ${(n.payload as { commonName?: string }).commonName ?? "una especie"}!`
                : n.type === "level_up"
                  ? `¡Subiste a nivel ${(n.payload as { newLevel?: number }).newLevel ?? "?"}!`
                  : n.type}
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="action-fab-menu">
          <button
            className="action-fab-option"
            aria-label="Notificaciones"
            onClick={() => setShowList((v) => !v)}
          >
            <img src="/icons/notificaciones.png" alt="" />
            {unreadCount > 0 && <span className="action-fab-badge">{unreadCount}</span>}
          </button>
          <button
            className="action-fab-option"
            aria-label="Perfil"
            onClick={() => {
              closeAll();
              navigate("/perfil");
            }}
          >
            <img src="/icons/perfil.png" alt="" />
          </button>
        </div>
      )}
      <button
        className="action-fab-main"
        aria-label="Acciones"
        aria-expanded={open}
        onClick={() => (open ? closeAll() : setOpen(true))}
      >
        <img src="/icons/boton-accion.png" alt="" />
        {!open && unreadCount > 0 && <span className="action-fab-badge">{unreadCount}</span>}
      </button>
      {levelUpTo !== null && <LevelUpModal level={levelUpTo} onClose={() => setLevelUpTo(null)} />}
    </div>
  );
}
