import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppNotification } from "../lib/api";
import { LevelUpScreen } from "./LevelUpScreen";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNotifications } from "../lib/NotificationsContext";
import { useAppNavigate } from "../lib/navigation";

// Notification bell in the header, left of the level ring (design chosen
// 2026-11-18; icon changed 2026-11-25 to a plain gold bell glyph: the illustrated
// medallion was unreadable at header size). A new notification slides in as a banner and, after a moment,
// folds into the bell, which rings. Hidden on the account screens, in Percibir
// and whenever the bottom nav is hidden (immersive moments), like the level ring.

const HIDDEN_ON = ["/login", "/registro", "/elegir-usuario", "/privacidad", "/percibir"];
const BANNER_MS = 2300;
const FOLD_MS = 520;
const RING_MS = 1000;
// These already have their own moment on screen (level-up screen, streak toast):
// they only make the bell ring.
const QUIET_TYPES = new Set(["level_up", "streak_reward"]);

export function notificationText(n: AppNotification): string {
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

function notificationIcon(n: AppNotification): string {
  switch (n.type) {
    case "fusion_ready":
      return "🧬";
    case "level_up":
      return "🏅";
    case "streak_reward":
      return "🔥";
    case "energy_available":
      return "⚡";
    default:
      return "🔔";
  }
}

export default function NotificationBell() {
  const navigate = useAppNavigate();
  const { pathname } = useLocation();
  const { visible } = useNavVisibility();
  const { notifications, unreadCount, markRead, incoming, clearIncoming } = useNotifications();
  const [showList, setShowList] = useState(false);
  const [banner, setBanner] = useState<AppNotification | null>(null);
  const [folding, setFolding] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [levelUpTo, setLevelUpTo] = useState<{ previousLevel: number; level: number } | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const shown = visible && !HIDDEN_ON.includes(pathname);

  function ring() {
    setRinging(true);
    setTimeout(() => setRinging(false), RING_MS);
  }

  // A notification arrived: banner (if the bell is on screen and it is not one
  // that has its own moment), then fold into the bell and ring it.
  useEffect(() => {
    if (!incoming) return;
    const n = incoming;
    clearIncoming();
    if (!shown) return;
    if (QUIET_TYPES.has(n.type)) {
      ring();
      return;
    }
    setBanner(n);
    setFolding(false);
  }, [incoming, clearIncoming, shown]);

  useEffect(() => {
    if (!banner) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        const el = bannerRef.current;
        const bell = bellRef.current;
        if (!reduced && el && bell && typeof el.animate === "function") {
          const a = el.getBoundingClientRect();
          const b = bell.getBoundingClientRect();
          const dx = b.left + b.width / 2 - (a.left + a.width / 2);
          const dy = b.top + b.height / 2 - (a.top + a.height / 2);
          setFolding(true);
          const flight = el.animate(
            [
              { transform: "none", opacity: 1 },
              { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.4 },
            ],
            { duration: FOLD_MS, easing: "cubic-bezier(0.6, 0, 0.9, 0.5)", fill: "forwards" },
          );
          flight.onfinish = () => {
            setBanner(null);
            ring();
          };
        } else {
          setBanner(null);
          ring();
        }
      }, BANNER_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [banner]);

  // Leaving the bell's screens closes its list.
  useEffect(() => {
    if (!shown) setShowList(false);
  }, [shown]);

  async function handleNotificationClick(notification: AppNotification) {
    await markRead(notification.id);
    setShowList(false);
    if (notification.type === "fusion_ready") {
      const payload = notification.payload as { speciesId?: number };
      navigate(payload.speciesId ? `/fusion?speciesId=${payload.speciesId}` : "/fusion");
    }
    if (notification.type === "level_up") {
      const payload = notification.payload as { newLevel?: number };
      if (payload.newLevel) setLevelUpTo({ previousLevel: payload.newLevel - 1, level: payload.newLevel });
      return;
    }
    if (notification.type === "energy_available") navigate("/percibir");
  }

  return (
    <>
      {shown && (
        <div className="notif-bell-wrap">
          {showList && (
            <>
              <div className="notif-backdrop" onClick={() => setShowList(false)} />
              <div className="card notif-list">
                {notifications.length === 0 && <p>Sin notificaciones.</p>}
                {notifications.map((n, i) => (
                  <div
                    key={n.id}
                    className="card-clickable truncate notif-item"
                    role="button"
                    tabIndex={0}
                    style={{ fontWeight: 700, "--k": i } as React.CSSProperties}
                    onClick={() => handleNotificationClick(n)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNotificationClick(n)}
                  >
                    {notificationText(n)}
                  </div>
                ))}
              </div>
            </>
          )}
          <button
            ref={bellRef}
            className={`notif-bell${ringing ? " notif-bell-ring" : ""}`}
            aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : "Notificaciones"}
            aria-expanded={showList}
            onClick={() => setShowList((v) => !v)}
          >
            <svg className="notif-bell-glyph" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.2c-.9 0-1.6.7-1.6 1.6v.7C7.6 5.2 6 7.6 6 10.4v3.3L4.3 16c-.5.7 0 1.7.9 1.7h13.6c.9 0 1.4-1 .9-1.7L18 13.7v-3.3c0-2.8-1.6-5.2-4.4-5.9v-.7c0-.9-.7-1.6-1.6-1.6Z" />
              <path d="M9.6 19c.3 1.2 1.3 2 2.4 2s2.1-.8 2.4-2H9.6Z" />
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
        </div>
      )}
      {shown && banner && (
        <div ref={bannerRef} className={`notif-banner${folding ? " notif-banner-folding" : ""}`} role="status">
          <span className="notif-banner-icon" aria-hidden="true">{notificationIcon(banner)}</span>
          <span>{notificationText(banner)}</span>
        </div>
      )}
      {levelUpTo && (
        <LevelUpScreen previousLevel={levelUpTo.previousLevel} level={levelUpTo.level} onClose={() => setLevelUpTo(null)} />
      )}
    </>
  );
}
