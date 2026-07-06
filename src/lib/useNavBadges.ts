import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getEnergy, getDex, DexSlot, DexSlotRevealed } from "./api";
import { useNotifications } from "./NotificationsContext";

const ECODEX_LAST_SEEN_KEY = "ecorex_ecodex_last_seen_at";

export interface NavBadges {
  inicioCount: number;
  percibirActive: boolean;
  ecodexActive: boolean;
  ecodexNewestSlotKey: string | null;
}

export function useNavBadges(): NavBadges {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [percibirActive, setPercibirActive] = useState(false);
  const [ecodexActive, setEcodexActive] = useState(false);
  const [ecodexNewestSlotKey, setEcodexNewestSlotKey] = useState<string | null>(null);

  useEffect(() => {
    getEnergy()
      .then((data) => setPercibirActive(!data.unlimited && data.remaining === data.max))
      .catch(() => {});

    getDex()
      .then((data) => {
        const lastSeenAt = Number(localStorage.getItem(ECODEX_LAST_SEEN_KEY) ?? 0);
        const isRevealed = (s: DexSlot): s is DexSlotRevealed => !s.locked;
        const unseen = data.slots
          .filter(isRevealed)
          .filter((s) => new Date(s.discovered_at).getTime() > lastSeenAt)
          .sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime());
        if (location.pathname === "/coleccion") {
          localStorage.setItem(ECODEX_LAST_SEEN_KEY, String(Date.now()));
          setEcodexActive(false);
          setEcodexNewestSlotKey(null);
        } else {
          setEcodexActive(unseen.length > 0);
          setEcodexNewestSlotKey(unseen.length > 0 ? `${unseen[0].species_id}_${unseen[0].phase}` : null);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  return { inicioCount: unreadCount, percibirActive, ecodexActive, ecodexNewestSlotKey };
}
