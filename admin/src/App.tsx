import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api, ApiError, type AdminSession } from "./api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import Discovery from "./pages/Discovery";
import DraftDetail from "./pages/DraftDetail";
import Species from "./pages/Species";

type State = { status: "loading" } | { status: "anon" } | { status: "ready"; session: AdminSession };

export default function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      setState({ status: "ready", session: await api<AdminSession>("/session") });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setState({ status: "anon" });
      else setState({ status: "anon" });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") return <p className="muted center">Cargando…</p>;
  if (state.status === "anon") return <Login onLoggedIn={load} />;

  const { session } = state;
  const logout = async () => {
    await api("/logout", { method: "POST" });
    setState({ status: "anon" });
  };

  return (
    <div className="shell">
      <aside>
        <h1>Ecorex Admin</h1>
        <img src="/logo-ecorex.webp" alt="" className="side-logo" draggable={false} />
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/discovery">Species Discovery</NavLink>
          <NavLink to="/bestiario">Bestiario</NavLink>
          <NavLink to="/art-studio">Art Studio</NavLink>
        </nav>
        <footer>
          <span className="muted">{session.user.email} · {session.role}</span>
          <button onClick={logout}>Salir</button>
        </footer>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/discovery/:id" element={<DraftDetail />} />
          <Route path="/bestiario" element={<Species />} />
          <Route path="/art-studio" element={<Placeholder title="Art Studio" phase="Fases 6–10 (pendiente de decidir almacenamiento y proveedor de imágenes)" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
