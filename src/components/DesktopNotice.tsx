import { useEffect, useState } from "react";

// Ecorex está pensado para el móvil. En un escritorio (ratón + pantalla ancha)
// la app sigue funcionando en su columna de 480 px, y a un lado se muestra este
// aviso con un QR para abrirla en el móvil. Nunca bloquea: se puede ocultar y se
// recuerda. Se decide por tipo de puntero y no por User-Agent (falsificable, y
// iPadOS se hace pasar por Mac).
export const DESKTOP_QUERY = "(pointer: fine) and (hover: hover) and (min-width: 1100px)";
export const DESKTOP_NOTICE_KEY = "ecorex_desktop_notice_hidden";

function readHidden(): boolean {
  try {
    return localStorage.getItem(DESKTOP_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function DesktopNotice() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [hidden, setHidden] = useState(readHidden);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!isDesktop || hidden) return null;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(DESKTOP_NOTICE_KEY, "1");
    } catch {
      /* sin almacenamiento: se oculta solo en esta sesión */
    }
  };

  return (
    <aside className="desktop-notice" aria-label="Aviso de uso en móvil">
      <p className="desktop-notice-title">Mejor en el móvil</p>
      <p className="desktop-notice-text">Ecorex está pensado para jugar desde el teléfono. Escanea el código para abrirlo ahí.</p>
      <img className="desktop-notice-qr" src="/qr-ecorex.svg" alt="Código QR de ecorex-project.pages.dev" width={160} height={160} draggable={false} />
      <div className="desktop-notice-steps">
        <h3>Instálala como app</h3>
        <h4>En Android</h4>
        <ol>
          <li>Abre Ecorex en Chrome.</li>
          <li>Menú (tres puntos) → «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
          <li>Confirma y el icono aparecerá en tu pantalla.</li>
        </ol>
        <h4>En iPhone o iPad</h4>
        <ol>
          <li>Abre Ecorex en Safari.</li>
          <li>Pulsa Compartir (el cuadrado con una flecha hacia arriba).</li>
          <li>Elige «Añadir a pantalla de inicio» y pulsa «Añadir».</li>
        </ol>
      </div>
      <button type="button" className="btn-ghost" onClick={hide}>
        Continuar aquí
      </button>
    </aside>
  );
}
