import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, setAvatar, ApiError } from "../lib/api";
import { AVATAR_IDS, avatarUrl } from "../lib/avatars";
import { MailIcon, UserIcon, LockIcon } from "../components/AuthIcons";
import GoogleButton from "../components/GoogleButton";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  // The explorer card needs a photo: the first avatar is pre-picked, the player can change it.
  const [avatar, setAvatarChoice] = useState<string>(AVATAR_IDS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, display_name: displayName });
      // Registering does not take an avatar: set the chosen one right after (the
      // session cookie is already there). Failing here must not block the sign-up.
      await setAvatar(avatar).catch(() => {});
      navigate("/inicio");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al registrarse");
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

        <GoogleButton />

        <div className="auth-field">
          <MailIcon />
          <input
            id="email"
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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

        <div className="auth-field">
          <LockIcon />
          <input
            id="password"
            type="password"
            placeholder="Contraseña"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creando..." : "Crear mi carnet"}
        </button>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
        <p className="auth-switch">
          Al crear tu cuenta aceptas nuestra <Link to="/privacidad">política de privacidad</Link>.
        </p>
      </form>
    </div>
  );
}
