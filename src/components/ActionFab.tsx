import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppNotification } from "../lib/api";
import { LevelUpScreen } from "./LevelUpScreen";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNotifications } from "../lib/NotificationsContext";

function notificationText(n: AppNotification): string {
  switch (n.type) {
    case "fusion_ready":
      return `¡Ya puedes fusionar ${(n.payload as { commonName?: string }).commonName ?? "una especie"}!`;
    case "level_up":
      return `¡Subiste a nivel ${(n.payload as { newLevel?: number }).newLevel ?? "?"}!`;
    case "streak_reward": {
      const { days, xp } = n.payload as { days?: number; xp?: number };
      return `🔥 ¡Racha de ${days ?? "?"} días! +${xp ?? 0} XP y +1 ⚡`;
    }
    case "energy_available": {
      const { remaining, max } = n.payload as { remaining?: number; max?: number };
      return remaining && max
        ? `Tienes ${remaining}/${max} energía — ya puedes percibir.`
        : "Tienes nueva energía disponible.";
    }
    default:
      return n.type;
  }
}

export default function ActionFab() {
  const navigate = useNavigate();
  const { visible } = useNavVisibility();
  const { notifications, unreadCount, markRead } = useNotifications();
  const [showList, setShowList] = useState(false);
  const [levelUpTo, setLevelUpTo] = useState<{ previousLevel: number; level: number } | null>(null);

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
        setLevelUpTo({ previousLevel: payload.newLevel - 1, level: payload.newLevel });
      }
      return;
    }
    if (notification.type === "energy_available") {
      navigate("/percibir");
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
                {notificationText(n)}
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
        <img src="/icons/notificaciones.webp" alt="" />
        {unreadCount > 0 && <span className="action-fab-badge">{unreadCount}</span>}
      </button>
      {levelUpTo && (
        <LevelUpScreen
          previousLevel={levelUpTo.previousLevel}
          level={levelUpTo.level}
          onClose={() => setLevelUpTo(null)}
        />
      )}
    </div>
  );
}
