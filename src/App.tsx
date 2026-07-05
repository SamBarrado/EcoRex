import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import InicioPage from "./pages/InicioPage";
import PercibirPage from "./pages/PercibirPage";
import ColeccionPage from "./pages/ColeccionPage";
import PerfilPage from "./pages/PerfilPage";
import FusionPage from "./pages/FusionPage";
import PageHeader from "./components/PageHeader";
import ActionFab from "./components/ActionFab";
import BackgroundFx from "./components/BackgroundFx";

export default function App() {
  return (
    <BrowserRouter>
      <BackgroundFx />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
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
        <Route
          path="/coleccion"
          element={
            <>
              <PageHeader />
              <ColeccionPage />
              <ActionFab />
            </>
          }
        />
        <Route
          path="/perfil"
          element={
            <>
              <PageHeader />
              <PerfilPage />
              <ActionFab />
            </>
          }
        />
        <Route
          path="/fusion"
          element={
            <>
              <PageHeader />
              <FusionPage />
              <ActionFab />
            </>
          }
        />
        <Route path="/" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
