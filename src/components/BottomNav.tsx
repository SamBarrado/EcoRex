import { useLocation, useNavigate } from "react-router-dom";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNavBadges } from "../lib/useNavBadges";
import { useAvatar } from "../lib/AvatarContext";
import { avatarUrl } from "../lib/avatars";

const HIDDEN_ON = ["/login", "/registro", "/elegir-usuario"];

const TABS = [
  { path: "/inicio", label: "Inicio" },
  { path: "/percibir", label: "Percibir", icon: "/icons/percibir.png" },
  { path: "/coleccion", label: "EcoDex", icon: "/icons/mi-coleccion.png" },
  { path: "/perfil", label: "Yo", icon: "/icons/perfil.png" },
];

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { visible, pulsedPath } = useNavVisibility();
  const { avatar } = useAvatar();
  const { inicioCount, percibirActive, ecodexActive, ecodexNewestSlotKey } = useNavBadges();

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

  return (
    <nav className={`bottom-nav${visible ? "" : " bottom-nav-hidden"}`} aria-label="Navegación principal">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        const pulsing = pulsedPath === tab.path;
        const badge = badgeFor(tab.path);
        return (
          <button
            key={tab.path}
            className={`bottom-nav-tab${active ? " bottom-nav-tab-active" : ""}${pulsing ? " bottom-nav-tab-pulse" : ""}`}
            onClick={() => handleTabClick(tab.path)}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              {tab.path === "/perfil" && avatar ? (
                <img src={avatarUrl(avatar)} alt="" className="bottom-nav-avatar" />
              ) : tab.icon ? (
                <img src={tab.icon} alt="" />
              ) : (
                <HomeIcon />
              )}
              {badge !== null && (
                <span className="bottom-nav-badge">{typeof badge === "number" ? badge : ""}</span>
              )}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
