import { Link } from "react-router-dom";

// Contact for privacy requests. Change it here if it needs to be a different address.
const CONTACT_EMAIL = "hello.thinkingquality@gmail.com";
const LAST_UPDATED = "17 de noviembre de 2026";

export default function PrivacidadPage() {
  return (
    <div className="auth-page legal-page">
      <article className="auth-card legal-card">
        <h1 className="auth-title">Política de privacidad</h1>
        <p className="legal-updated">Última actualización: {LAST_UPDATED}</p>

        <p>
          Ecorex es un juego web para descubrir y coleccionar dinosaurios emocionales. Esta página explica qué datos
          guardamos cuando lo usas, para qué, y cómo puedes pedir que los borremos.
        </p>

        <h2>Qué datos guardamos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> tu email y tu nombre de usuario. Si te registras con contraseña, guardamos solo un
            resumen cifrado (hash) de ella, nunca la contraseña en sí.
          </li>
          <li>
            <strong>Si entras con Google:</strong> recibimos de Google únicamente tu identificador de cuenta y tu email
            verificado. No usamos ni guardamos tu nombre, tu foto ni ningún otro dato de tu cuenta de Google, y no
            accedemos a tu correo, contactos ni ficheros.
          </li>
          <li>
            <strong>Tu partida:</strong> las especies que descubres, tu experiencia, misiones, notificaciones, el avatar
            que eliges y la energía disponible.
          </li>
          <li>
            <strong>Notificaciones push (opcional):</strong> si las activas, guardamos los datos técnicos que tu
            navegador nos da para poder enviártelas. Puedes desactivarlas desde el propio navegador.
          </li>
          <li>
            <strong>Sesión:</strong> una cookie necesaria para mantenerte conectado durante 30 días. No usamos cookies de
            publicidad ni de seguimiento.
          </li>
          <li>
            <strong>Límite de intentos:</strong> para frenar abusos, guardamos durante como máximo una hora una huella
            irreversible (hash) de tu dirección IP. No guardamos la IP en claro.
          </li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>
          Solo para que el juego funcione: identificarte, guardar tu progreso, enviarte avisos que hayas activado y
          proteger el servicio de abusos. No vendemos tus datos, no los cedemos a terceros con fines comerciales y no
          mostramos publicidad.
        </p>

        <h2>Servicios que intervienen</h2>
        <p>
          Ecorex se aloja en Cloudflare (alojamiento, base de datos y almacenamiento temporal). El inicio de sesión con
          Google lo gestiona Google. El uso que hacemos de la información recibida de las APIs de Google cumple la{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Política de Datos del Usuario de los Servicios de las APIs de Google
          </a>
          , incluidos los requisitos de uso limitado.
        </p>

        <h2>Tus derechos y cómo borrar tus datos</h2>
        <p>
          Puedes pedirnos acceder a tus datos, corregirlos o que borremos tu cuenta y todo tu progreso escribiendo a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> desde el email de tu cuenta. Si entraste con Google,
          también puedes retirar el acceso de Ecorex en la configuración de tu cuenta de Google.
        </p>

        <h2>Cambios</h2>
        <p>
          Si cambiamos algo importante en esta política, actualizaremos la fecha de arriba.
        </p>

        <p className="auth-switch">
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </article>
    </div>
  );
}
