import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setUsername, setAvatar, ApiError } from "../lib/api";
import { AVATAR_IDS, avatarUrl } from "../lib/avatars";
import { UserIcon } from "../components/AuthIcons";

export default function UsernameSetupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  // Same explorer card as the sign-up page: Google accounts have no avatar yet.
  const [avatar, setAvatarChoice] = useState<string>(AVATAR_IDS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await setUsername({ display_name: displayName });
      // Failing to save the avatar must not block the account setup.
      await setAvatar(avatar).catch(() => {});
      navigate("/inicio");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar el nombre de usuario");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-badge-wrap">
        <div className="auth-badge">
          <img src="/logo/logo-ecorex.webp" alt="Ecorex" />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="auth-card">
        <h1 className="auth-title">Tu carnet de explorador</h1>

        <div className="id-card">
          <div className="id-card-photo">
            <img src={avatarUrl(avatar)} alt="" />
          </div>
          <div className="id-card-body">
            <small>CARNET DE EXPLORADOR</small>
            <b className="id-card-name" key={displayName}>{displayName || "Tu nombre"}</b>
            <span>Nivel 1 · Explorador Novato</span>
          </div>
          <i className="id-card-foil" aria-hidden="true" />
        </div>

        <div className="id-avatars" role="radiogroup" aria-label="Elige tu avatar">
          {AVATAR_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={avatar === id}
              aria-label={`Avatar ${i + 1}`}
              className={`id-avatar${avatar === id ? " on" : ""}`}
              onClick={() => setAvatarChoice(id)}
            >
              <img src={avatarUrl(id)} alt="" />
            </button>
          ))}
        </div>

        <div className="auth-field">
          <UserIcon />
          <input
            id="display_name"
            type="text"
            placeholder="Nombre de usuario"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            title="3-20 caracteres: letras, números o _"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creando..." : "Crear mi carnet"}
        </button>
      </form>
    </div>
  );
}
