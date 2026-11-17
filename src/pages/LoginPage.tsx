import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { login, ApiError } from "../lib/api";
import { MailIcon, LockIcon } from "../components/AuthIcons";
import GoogleButton, { googleErrorMessage } from "../components/GoogleButton";
import { version } from "../../package.json";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(googleErrorMessage(searchParams.get("error")));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await login({ email, password });
      navigate(user.needs_username_setup ? "/elegir-usuario" : "/inicio");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar sesión");
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
        <h1 className="auth-title">Iniciar sesión</h1>

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
          <LockIcon />
          <input
            id="password"
            type="password"
            placeholder="Contraseña"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </form>
      <p style={{ textAlign: "center", color: "#7fa98a", fontSize: "0.75rem" }}>v{version}</p>
    </div>
  );
}
