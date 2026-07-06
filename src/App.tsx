import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UsernameSetupPage from "./pages/UsernameSetupPage";
import InicioPage from "./pages/InicioPage";
import PercibirPage from "./pages/PercibirPage";
import ColeccionPage from "./pages/ColeccionPage";
import PerfilPage from "./pages/PerfilPage";
import FusionPage from "./pages/FusionPage";
import PageHeader from "./components/PageHeader";
import ActionFab from "./components/ActionFab";
import BottomNav from "./components/BottomNav";
import { NavVisibilityProvider } from "./lib/NavVisibilityContext";
import { NotificationsProvider } from "./lib/NotificationsContext";

export default function App() {
  return (
    <BrowserRouter>
      <NavVisibilityProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/elegir-usuario" element={<UsernameSetupPage />} />
            <Route
              path="/inicio"
              element={
                <>
                  <InicioPage />
                  <ActionFab />
                </>
              }
            />
            <Route path="/percibir" element={<PercibirPage />} />
            <Route path="/coleccion" element={<ColeccionPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route
              path="/fusion"
              element={
                <>
                  <PageHeader />
                  <FusionPage />
                </>
              }
            />
            <Route path="/" element={<Navigate to="/inicio" replace />} />
          </Routes>
          <BottomNav />
        </NotificationsProvider>
      </NavVisibilityProvider>
    </BrowserRouter>
  );
}
