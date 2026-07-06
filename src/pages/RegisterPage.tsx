import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, ApiError } from "../lib/api";
import { MailIcon, UserIcon, LockIcon } from "../components/AuthIcons";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, display_name: displayName });
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
          <img src="/logo/logo-ecorex.png" alt="Ecorex" />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>

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
          {loading ? "Creando..." : "Registrarme"}
        </button>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </form>
    </div>
  );
}
