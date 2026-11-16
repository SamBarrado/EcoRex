import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getMyProfile } from "./api";

interface AvatarValue {
  /** undefined = not loaded yet, null = loaded and none chosen. */
  avatar: string | null | undefined;
  setCurrentAvatar: (avatar: string | null) => void;
  /** Forget the loaded avatar (logout), so the next user's is fetched. */
  clearAvatar: () => void;
}

const AvatarContext = createContext<AvatarValue | null>(null);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (avatar !== undefined) return;
    // Not loaded yet (first visit, or right after login/logout). On /login this
    // 401s harmlessly and is retried on the next route change.
    let cancelled = false;
    getMyProfile()
      .then((profile) => {
        if (!cancelled) setAvatar(profile.user.avatar ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [avatar, location.pathname]);

  const value = useMemo(
    () => ({ avatar, setCurrentAvatar: setAvatar, clearAvatar: () => setAvatar(undefined) }),
    [avatar]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatar must be used within AvatarProvider");
  return ctx;
}
