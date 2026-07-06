import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppNotification } from "../lib/api";
import { LevelUpModal } from "./LevelUpModal";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNotifications } from "../lib/NotificationsContext";

export default function ActionFab() {
  const navigate = useNavigate();
  const { visible } = useNavVisibility();
  const { notifications, unreadCount, markRead } = useNotifications();
  const [showList, setShowList] = useState(false);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

  function closeAll() {
    setShowList(false);
  }

  async function handleNotificationClick(notification: AppNotification) {
    await markRead(notification.id);
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
    <div className={`action-fab-container${visible ? "" : " action-fab-container-hidden"}`}>
      {showList && (
        <>
          <div className="action-fab-backdrop" onClick={closeAll} />
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
        </>
      )}
      <button
        className="action-fab-main"
        aria-label="Notificaciones"
        onClick={() => setShowList((v) => !v)}
      >
        <img src="/icons/notificaciones.png" alt="" />
        {unreadCount > 0 && <span className="action-fab-badge">{unreadCount}</span>}
      </button>
      {levelUpTo !== null && <LevelUpModal level={levelUpTo} onClose={() => setLevelUpTo(null)} />}
    </div>
  );
}
