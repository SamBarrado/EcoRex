import { createSession, setSessionCookie, verifyPassword } from "../../../../functions/lib/auth";
import { getClientIp, rateLimit } from "../../../../functions/lib/rateLimit";
import { isAdminRole, jsonError, writeAudit, type AdminEnv } from "../../lib/adminAuth";

const LOGIN_LIMIT_PER_HOUR = 5;

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  if (!(await rateLimit(env.RATE_LIMIT_KV, `admin-login:${getClientIp(request)}`, LOGIN_LIMIT_PER_HOUR))) {
    return jsonError(429, "Demasiados intentos. Espera un poco.");
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "JSON no válido");
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !body.password) return jsonError(400, "Email y contraseña obligatorios");

  const user = await env.DB.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: number; email: string; password_hash: string | null; role: string }>();

  // Same answer for "no such user", "wrong password" and "not an admin" so the
  // endpoint can't be used to discover which accounts are administrators.
  const valid = !!user && !!user.password_hash && (await verifyPassword(body.password, user.password_hash));
  if (!user || !valid || !isAdminRole(user.role)) return jsonError(401, "Credenciales no válidas");

  const sessionId = await createSession(env.DB, user.id);
  await writeAudit(env.DB, user.id, "admin.login");
  const secure = new URL(request.url).protocol === "https:";
  return new Response(JSON.stringify({ user: { id: user.id, email: user.email, role: user.role } }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": setSessionCookie(sessionId, secure) },
  });
};
