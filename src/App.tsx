import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UsernameSetupPage from "./pages/UsernameSetupPage";
import PrivacidadPage from "./pages/PrivacidadPage";
import InicioPage from "./pages/InicioPage";
import PercibirPage from "./pages/PercibirPage";
import ColeccionPage from "./pages/ColeccionPage";
import PerfilPage from "./pages/PerfilPage";
import FusionPage from "./pages/FusionPage";
import PageHeader from "./components/PageHeader";
import NotificationBell from "./components/NotificationBell";
import { AchievementsProvider } from "./lib/AchievementsContext";
import BottomNav from "./components/BottomNav";
import Atmosphere from "./components/Atmosphere";
import LevelHud from "./components/LevelHud";
import DesktopNotice from "./components/DesktopNotice";
import { NavVisibilityProvider } from "./lib/NavVisibilityContext";
import { NotificationsProvider } from "./lib/NotificationsContext";
import { PlayerProvider } from "./lib/PlayerContext";
import { AvatarProvider } from "./lib/AvatarContext";

// Common shell: shared state, the living background, the page outlet and the
// persistent chrome (bottom nav + level ring).
function Shell() {
  return (
    <NavVisibilityProvider>
      <PlayerProvider>
        <NotificationsProvider>
          <AvatarProvider>
            <AchievementsProvider>
              <Atmosphere />
              <Outlet />
              <BottomNav />
              <LevelHud />
              <NotificationBell />
              <DesktopNotice />
            </AchievementsProvider>
          </AvatarProvider>
        </NotificationsProvider>
      </PlayerProvider>
    </NavVisibilityProvider>
  );
}

// A *data* router (not <BrowserRouter>) on purpose: only data routers can run a
// navigation inside the browser's View Transitions API (`viewTransition: true`,
// see lib/navigation.ts), which gives the directional slide between screens.
export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/registro", element: <RegisterPage /> },
      { path: "/elegir-usuario", element: <UsernameSetupPage /> },
      { path: "/privacidad", element: <PrivacidadPage /> },
      {
        path: "/inicio",
        element: <InicioPage />,
      },
      { path: "/percibir", element: <PercibirPage /> },
      { path: "/coleccion", element: <ColeccionPage /> },
      { path: "/perfil", element: <PerfilPage /> },
      {
        path: "/fusion",
        element: (
          <>
            <PageHeader />
            <FusionPage />
          </>
        ),
      },
      { path: "/", element: <Navigate to="/inicio" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
