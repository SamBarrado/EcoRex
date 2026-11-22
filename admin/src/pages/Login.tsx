import { useState, type FormEvent } from "react";
import { api } from "../api";

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>Ecorex Admin</h1>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={busy}>Entrar</button>
    </form>
  );
}
