import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, ApiError } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/inicio");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <img src="/logo/logo-ecorex.png" alt="Ecorex" className="auth-logo" />
      <h1>Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p>
        ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
    </div>
  );
}
