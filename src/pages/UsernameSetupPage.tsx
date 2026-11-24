import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setUsername, ApiError } from "../lib/api";
import { UserIcon } from "../components/AuthIcons";

export default function UsernameSetupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await setUsername({ display_name: displayName });
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
        <h1 className="auth-title">Elige tu nombre de usuario</h1>
        <p className="auth-switch" style={{ marginTop: 0, marginBottom: "1rem" }}>
          Tu cuenta necesita un nombre de usuario único para continuar.
        </p>

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
          {loading ? "Guardando..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}
