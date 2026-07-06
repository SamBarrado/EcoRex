import { createContext, useContext, useMemo, useState, ReactNode } from "react";

interface NavVisibilityValue {
  visible: boolean;
  hideNav: () => void;
  showNav: () => void;
}

const NavVisibilityContext = createContext<NavVisibilityValue | null>(null);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);

  const value = useMemo(
    () => ({
      visible,
      hideNav: () => setVisible(false),
      showNav: () => setVisible(true),
    }),
    [visible]
  );

  return <NavVisibilityContext.Provider value={value}>{children}</NavVisibilityContext.Provider>;
}

export function useNavVisibility() {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx) throw new Error("useNavVisibility must be used within NavVisibilityProvider");
  return ctx;
}
