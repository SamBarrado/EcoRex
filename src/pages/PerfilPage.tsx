import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile, logout, setAvatar, ProfileStats, ApiError } from "../lib/api";
import { AVATAR_IDS, avatarUrl } from "../lib/avatars";
import { useAvatar } from "../lib/AvatarContext";
import { RARITY_GLOW, RARITY_ORDER, shortRarityName } from "../lib/rarityGlow";
import { isPushSupported, getNotificationPermission, subscribeToPush, unsubscribeFromPush, hasActivePushSubscription } from "../lib/push";

function Donut({ value, total, label, tone }: { value: number; total: number; label: string; tone: "green" | "blue" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`profile-donut profile-donut-${tone}`} role="img" aria-label={`${label} ${value} de ${total}`}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="34" className="t" />
        <circle cx="40" cy="40" r="34" className="f" pathLength="100" style={{ strokeDasharray: `${pct} 100` }} />
      </svg>
      <div className="profile-donut-n" aria-hidden="true">
        <b>{value}</b>
        <small>/{total}</small>
      </div>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

export default function PerfilPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { setCurrentAvatar, clearAvatar } = useAvatar();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const pushDenied = isPushSupported() && getNotificationPermission() === "denied";

  useEffect(() => {
    if (!isPushSupported()) return;
    hasActivePushSubscription().then(setPushEnabled).catch(() => setPushEnabled(false));
  }, []);

  async function handleTogglePush() {
    setPushError(null);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush();
      }
      setPushEnabled(await hasActivePushSubscription());
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "No se pudieron cambiar las notificaciones.");
      setPushEnabled(await hasActivePushSubscription().catch(() => false));
    }
  }

  useEffect(() => {
    setError(null);
    getMyProfile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        // A non-ApiError here means fetch itself failed (server unreachable,
        // connection reset, etc.) — not an auth problem, so don't imply the
        // session was closed.
        setError("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
      });
  }, [navigate, retryCount]);

  async function handleChooseAvatar(avatar: string | null) {
    setAvatarError(null);
    try {
      const result = await setAvatar(avatar);
      setProfile((current) => (current ? { ...current, user: { ...current.user, avatar: result.avatar } } : current));
      setCurrentAvatar(result.avatar);
      setAvatarPickerOpen(false);
    } catch {
      setAvatarError("No se pudo guardar el avatar. Inténtalo de nuevo.");
    }
  }

  async function handleLogout() {
    await logout();
    clearAvatar();
    navigate("/login");
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <button onClick={() => setRetryCount((n) => n + 1)}>Reintentar</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <p>Cargando...</p>
      </div>
    );
  }

  const avatarLabel = (profile.user.display_name || profile.user.email).trim();
  const avatarInitial = avatarLabel.charAt(0).toUpperCase();
  const currentAvatar = profile.user.avatar ?? null;

  const xpPct =
    profile.xpForNextLevel === null || profile.xpForNextLevel === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((profile.xpIntoLevel / profile.xpForNextLevel) * 100)));
  const rarityTiers = [...profile.rarityBreakdown]
    .filter((tier) => tier.count > 0)
    .sort((a, b) => RARITY_ORDER.indexOf(a.slug as never) - RARITY_ORDER.indexOf(b.slug as never));

  return (
    <div className="page">
      <h1>Yo</h1>

      <section className="home-hero">
        <div className="home-hero-top">
          <div className="home-ring profile-ring">
            <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
              <circle cx="32" cy="32" r="28" className="home-ring-track" />
              <circle cx="32" cy="32" r="28" className="home-ring-fill" pathLength="100" style={{ strokeDasharray: `${xpPct} 100` }} />
            </svg>
            <div
              className="avatar avatar-clickable"
              role="button"
              tabIndex={0}
              aria-label="Cambiar avatar"
              onClick={() => setAvatarPickerOpen((open) => !open)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setAvatarPickerOpen((open) => !open);
              }}
            >
              {currentAvatar ? <img src={avatarUrl(currentAvatar)} alt="" className="avatar-img" /> : avatarInitial}
            </div>
          </div>
          <div className="home-hero-text">
            <b>{profile.user.display_name || profile.user.email}</b>
            <span>
              Nivel {profile.level}
              {profile.title ? ` · ${profile.title}` : ""}
            </span>
            <div className="level-progress-bar">
              <div className="level-progress-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <small>{profile.xpForNextLevel === null ? "MAX" : `${profile.xpIntoLevel}/${profile.xpForNextLevel} XP`}</small>
          </div>
        </div>
      </section>

      {avatarPickerOpen && (
        <div className="card">
          <strong>Elige tu avatar</strong>
          <div className="avatar-picker">
            {AVATAR_IDS.map((id) => (
              <div
                key={id}
                className="avatar avatar-option"
                role="button"
                tabIndex={0}
                aria-label={`Avatar ${id.replace("avatar-", "")}`}
                aria-pressed={currentAvatar === id}
                onClick={() => handleChooseAvatar(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleChooseAvatar(id);
                }}
              >
                <img src={avatarUrl(id)} alt="" className="avatar-img" />
              </div>
            ))}
            <div
              className="avatar avatar-option"
              role="button"
              tabIndex={0}
              aria-label="Usar mi inicial"
              aria-pressed={currentAvatar === null}
              onClick={() => handleChooseAvatar(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleChooseAvatar(null);
              }}
            >
              {avatarInitial}
            </div>
          </div>
          {avatarError && <p className="error">{avatarError}</p>}
        </div>
      )}

      <div className="card profile-donuts">
        <Donut value={profile.speciesDiscoveredCount} total={profile.speciesTotalCount} label="Especies descubiertas" tone="green" />
        <Donut value={profile.registeredCount} total={profile.registeredTotalCount} label="Registros del EcoDex" tone="blue" />
      </div>

      <div className="profile-chips">
        <div className="home-chip" role="group" aria-label={`Cartas conseguidas ${profile.totalDiscoveries}`}>
          <span className="home-chip-value">{profile.totalDiscoveries}</span>
          <small>Cartas</small>
        </div>
        <div className="home-chip" role="group" aria-label={`Cartas repetidas ${profile.repeatedCount}`}>
          <span className="home-chip-value">{profile.repeatedCount}</span>
          <small>Repetidas</small>
        </div>
      </div>

      {rarityTiers.length > 0 && (
        <div className="card">
          <strong>Por rareza</strong>
          <div className="profile-stack" role="img" aria-label={rarityTiers.map((t) => `${shortRarityName(t.name)} ${t.count}`).join(", ")}>
            {rarityTiers.map((tier) => (
              <i key={tier.slug} style={{ flex: tier.count, background: RARITY_GLOW[tier.slug] ?? RARITY_GLOW.registrada }} />
            ))}
          </div>
          <ul className="profile-legend">
            {rarityTiers.map((tier) => (
              <li key={tier.slug}>
                <i style={{ background: RARITY_GLOW[tier.slug] ?? RARITY_GLOW.registrada }} />
                <span>{shortRarityName(tier.name)}</span>
                <b>{tier.count}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isPushSupported() && (
        <div className="card">
          <div className="profile-toggle">
            <span>🔔 Avisos de energía</span>
            <label className="profile-switch">
              <input type="checkbox" role="switch" aria-label="Avisos de energía" checked={pushEnabled} disabled={pushDenied} onChange={handleTogglePush} />
              <i aria-hidden="true" />
            </label>
          </div>
          {pushError && <p role="alert">{pushError}</p>}
          {pushDenied && (
            <p>Bloqueaste los permisos de notificación en el navegador. Actívalos desde los ajustes del navegador para este sitio.</p>
          )}
        </div>
      )}

      <div className="btn-row">
        <button onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </div>
  );
}
