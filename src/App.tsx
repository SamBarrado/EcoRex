import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import InicioPage from "./pages/InicioPage";
import PercibirPage from "./pages/PercibirPage";
import ColeccionPage from "./pages/ColeccionPage";
import PerfilPage from "./pages/PerfilPage";
import FusionPage from "./pages/FusionPage";
import NotificationBell from "./components/NotificationBell";

function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/inicio" className={({ isActive }) => (isActive ? "active" : "")}>
        Inicio
      </NavLink>
      <NavLink to="/percibir" className={({ isActive }) => (isActive ? "active" : "")}>
        Percibir
      </NavLink>
      <NavLink to="/coleccion" className={({ isActive }) => (isActive ? "active" : "")}>
        Colección
      </NavLink>
      <NavLink to="/perfil" className={({ isActive }) => (isActive ? "active" : "")}>
        Yo
      </NavLink>
      <NotificationBell />
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
          path="/inicio"
          element={
            <>
              <InicioPage />
              <TabBar />
            </>
          }
        />
        <Route
          path="/percibir"
          element={
            <>
              <PercibirPage />
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
        <Route
          path="/fusion"
          element={
            <>
              <FusionPage />
              <TabBar />
            </>
          }
        />
        <Route path="/" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
