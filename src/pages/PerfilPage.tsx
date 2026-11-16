import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile, logout, setAvatar, ProfileStats, ApiError } from "../lib/api";
import { AVATAR_IDS, avatarUrl } from "../lib/avatars";
import { useAvatar } from "../lib/AvatarContext";
import { isPushSupported, getNotificationPermission, subscribeToPush, unsubscribeFromPush } from "../lib/push";

export default function PerfilPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { setCurrentAvatar, clearAvatar } = useAvatar();
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(isPushSupported() && getNotificationPermission() === "granted");
  const pushDenied = isPushSupported() && getNotificationPermission() === "denied";

  async function handleTogglePush() {
    if (pushEnabled) {
      await unsubscribeFromPush();
      setPushEnabled(false);
    } else {
      await subscribeToPush();
      setPushEnabled(getNotificationPermission() === "granted");
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

  const progressPct =
    profile.speciesTotalCount > 0
      ? Math.round((profile.speciesDiscoveredCount / profile.speciesTotalCount) * 100)
      : 0;

  const avatarLabel = (profile.user.display_name || profile.user.email).trim();
  const avatarInitial = avatarLabel.charAt(0).toUpperCase();
  const currentAvatar = profile.user.avatar ?? null;

  return (
    <div className="page">
      <h1>Yo</h1>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
        <div>
          <strong>{profile.user.display_name || profile.user.email}</strong>
          <div>{profile.user.email}</div>
          <div>Nivel {profile.level}</div>
          <div>{profile.title}</div>
        </div>
      </div>

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

      <div className="card">
        <div className="stat">
          <span>Progreso de nivel</span>
          <span>
            {profile.xpForNextLevel === null
              ? "MAX"
              : `${profile.xpIntoLevel}/${profile.xpForNextLevel} XP`}
          </span>
        </div>
        {profile.xpForNextLevel !== null && (
          <div className="level-progress-bar">
            <div
              className="level-progress-fill"
              style={{ width: `${Math.round((profile.xpIntoLevel / profile.xpForNextLevel) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="card">
        <div className="stat">
          <span>Progreso de colección</span>
          <span>
            {profile.speciesDiscoveredCount}/{profile.speciesTotalCount} ({progressPct}%)
          </span>
        </div>
        <div className="stat">
          <span>Capturas totales</span>
          <span>{profile.totalDiscoveries}</span>
        </div>
        <div className="stat">
          <span>Duplicados</span>
          <span>{profile.duplicateCount}</span>
        </div>
      </div>

      {profile.rarityBreakdown.length > 0 && (
        <div className="card">
          <strong>Por rareza</strong>
          {profile.rarityBreakdown.map((tier) => (
            <div className="stat" key={tier.slug}>
              <span>{tier.name}</span>
              <span>{tier.count}</span>
            </div>
          ))}
        </div>
      )}

      {isPushSupported() && (
        <div className="card">
          <div className="stat">
            <span>Notificaciones de energía</span>
            <input type="checkbox" checked={pushEnabled} disabled={pushDenied} onChange={handleTogglePush} />
          </div>
          {pushDenied && (
            <p>Bloqueaste los permisos de notificación en el navegador. Actívalos desde los ajustes del navegador para este sitio.</p>
          )}
        </div>
      )}

      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
