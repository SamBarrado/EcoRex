import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { useAppNavigate } from "../lib/navigation";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNavBadges } from "../lib/useNavBadges";
import { useAvatar } from "../lib/AvatarContext";
import { avatarUrl } from "../lib/avatars";
import { usePlayer } from "../lib/PlayerContext";
import { energyFraction } from "./Atmosphere";

const HIDDEN_ON = ["/login", "/registro", "/elegir-usuario", "/privacidad"];

// Four line icons with the same stroke (the avatar is the only picture): the bar used to mix a line house
// with illustrated icons. Percibir's eye gets a ring that shows the energy left.
type NavIconName = "home" | "eye" | "dex" | "user";

const TABS: { path: string; label: string; icon: NavIconName }[] = [
  { path: "/inicio", label: "Inicio", icon: "home" },
  { path: "/percibir", label: "Percibir", icon: "eye" },
  { path: "/coleccion", label: "EcoDex", icon: "dex" },
  { path: "/perfil", label: "Yo", icon: "user" },
];

function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {name === "home" && (
        <>
          <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {name === "eye" && (
        <>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {name === "dex" && (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.6" />
          <rect x="13" y="4" width="7" height="7" rx="1.6" />
          <rect x="4" y="13" width="7" height="7" rx="1.6" />
          <rect x="13" y="13" width="7" height="7" rx="1.6" />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function EnergyRing({ fraction }: { fraction: number }) {
  return (
    <svg className="en-ring" viewBox="0 0 48 48" aria-hidden="true" data-testid="energy-ring">
      <circle cx="24" cy="24" r="21" className="t" />
      <circle cx="24" cy="24" r="21" className="f" pathLength="100" style={{ strokeDasharray: `${Math.round(fraction * 100)} 100` }} />
    </svg>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useAppNavigate();
  const { visible, pulsedPath } = useNavVisibility();
  const { avatar } = useAvatar();
  const { inicioCount, percibirActive, ecodexActive, ecodexNewestSlotKey } = useNavBadges();
  const { energy } = usePlayer();
  const fraction = energyFraction(energy);
  const energyKnown = !!energy && !energy.unlimited && energy.max > 0;

  if (HIDDEN_ON.includes(location.pathname)) return null;

  function badgeFor(path: string) {
    if (path === "/inicio" && inicioCount > 0) return inicioCount;
    if (path === "/percibir" && percibirActive) return true;
    if (path === "/coleccion" && ecodexActive) return true;
    return null;
  }

  function handleTabClick(path: string) {
    if (path === "/coleccion" && ecodexActive && ecodexNewestSlotKey) {
      navigate(path, { state: { justUnlockedKey: ecodexNewestSlotKey } });
      return;
    }
    navigate(path);
  }

  // The pill glides under the active tab; on screens that are not tabs (e.g. Fusión) it fades out.
  const activeIndex = TABS.findIndex((tab) => tab.path === location.pathname);

  return (
    <nav
      className={`bottom-nav${visible ? "" : " bottom-nav-hidden"}`}
      aria-label="Navegación principal"
      style={{ "--nav-i": Math.max(activeIndex, 0) } as CSSProperties}
    >
      <i className={`bottom-nav-pill${activeIndex === -1 ? " bottom-nav-pill-off" : ""}`} aria-hidden="true" data-testid="nav-pill" />
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        const pulsing = pulsedPath === tab.path;
        const badge = badgeFor(tab.path);
        return (
          <button
            key={tab.path}
            className={`bottom-nav-tab${active ? " bottom-nav-tab-active" : ""}${pulsing ? " bottom-nav-tab-pulse" : ""}${tab.path === "/percibir" ? ` bottom-nav-tab-percibir${fraction <= 0 ? " bottom-nav-tab-empty" : fraction >= 1 ? " bottom-nav-tab-full" : ""}` : ""}`}
            onClick={() => handleTabClick(tab.path)}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              {tab.path === "/percibir" && <EnergyRing fraction={fraction} />}
              {tab.path === "/perfil" && avatar ? (
                <img src={avatarUrl(avatar)} alt="" className="bottom-nav-avatar" />
              ) : (
                <NavIcon name={tab.icon} />
              )}
              {badge !== null && (
                <span className="bottom-nav-badge">{typeof badge === "number" ? badge : ""}</span>
              )}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
            {tab.path === "/percibir" && energyKnown && energy && (
              <span className="sr-only">{`energía ${energy.remaining} de ${energy.max}`}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
