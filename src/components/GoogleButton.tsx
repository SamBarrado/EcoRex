// A plain link, not a fetch: the OAuth flow needs a full-page navigation to Google.
export default function GoogleButton() {
  return (
    <>
      <a href="/api/auth/google/start" className="auth-google">
        <svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Continuar con Google
      </a>
      <p className="auth-divider">
        <span>o</span>
      </p>
    </>
  );
}

const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "Has cancelado el acceso con Google.",
  google_failed: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
  google_unavailable: "El acceso con Google no está disponible ahora mismo.",
  rate_limited: "Demasiados intentos. Espera un poco y vuelve a intentarlo.",
};

export function googleErrorMessage(code: string | null): string | null {
  return code ? (GOOGLE_ERRORS[code] ?? null) : null;
}
