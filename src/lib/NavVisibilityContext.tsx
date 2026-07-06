import { createContext, useContext, useMemo, useRef, useState, ReactNode } from "react";

const PULSE_DURATION_MS = 900;

interface NavVisibilityValue {
  visible: boolean;
  hideNav: () => void;
  showNav: () => void;
  pulsedPath: string | null;
  pulseTab: (path: string) => void;
}

const NavVisibilityContext = createContext<NavVisibilityValue | null>(null);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [pulsedPath, setPulsedPath] = useState<string | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = useMemo(
    () => ({
      visible,
      hideNav: () => setVisible(false),
      showNav: () => setVisible(true),
      pulsedPath,
      pulseTab: (path: string) => {
        if (pulseTimeoutRef.current !== null) clearTimeout(pulseTimeoutRef.current);
        setPulsedPath(path);
        pulseTimeoutRef.current = setTimeout(() => setPulsedPath(null), PULSE_DURATION_MS);
      },
    }),
    [visible, pulsedPath]
  );

  return <NavVisibilityContext.Provider value={value}>{children}</NavVisibilityContext.Provider>;
}

export function useNavVisibility() {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx) throw new Error("useNavVisibility must be used within NavVisibilityProvider");
  return ctx;
}
