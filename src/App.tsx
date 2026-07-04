import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ExplorarPage from "./pages/ExplorarPage";
import ColeccionPage from "./pages/ColeccionPage";
import PerfilPage from "./pages/PerfilPage";

function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/explorar" className={({ isActive }) => (isActive ? "active" : "")}>
        Explorar
      </NavLink>
      <NavLink to="/coleccion" className={({ isActive }) => (isActive ? "active" : "")}>
        Colección
      </NavLink>
      <NavLink to="/perfil" className={({ isActive }) => (isActive ? "active" : "")}>
        Yo
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          path="/explorar"
          element={
            <>
              <ExplorarPage />
              <TabBar />
            </>
          }
        />
        <Route
          path="/coleccion"
          element={
            <>
              <ColeccionPage />
              <TabBar />
            </>
          }
        />
        <Route
          path="/perfil"
          element={
            <>
              <PerfilPage />
              <TabBar />
            </>
          }
        />
        <Route path="/" element={<Navigate to="/explorar" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
