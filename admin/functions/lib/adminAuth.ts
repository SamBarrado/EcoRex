// Server-side authorization for Ecorex Admin. Every /api/admin/* request goes
// through authorize() (see api/admin/_middleware.ts): deny by default.
// Reuses the public app's session machinery (functions/lib/auth.ts); the role
// lives in users.role (migration 0004) and is never settable through the API.
import { getSessionCookie, verifySession, type Env, type SessionUser } from "../../../functions/lib/auth";

export type AdminRole = "admin" | "art_editor" | "content_editor";
export const ADMIN_ROLES: readonly AdminRole[] = ["admin", "art_editor", "content_editor"];

export interface AdminContext {
  user: SessionUser;
  role: AdminRole;
}

export interface AdminEnv extends Env {
  ANTHROPIC_API_KEY?: string;
}

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** `admin` satisfies any requirement; editors only their own area. */
export function hasRole(role: string, allowed: readonly AdminRole[]): boolean {
  if (!isAdminRole(role)) return false;
  return role === "admin" || allowed.includes(role);
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard. SameSite=Lax alone doesn't cover everything, so mutating
 * requests must carry an Origin equal to this host.
 */
export function isSameOrigin(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function authorize(
  db: D1Database,
  request: Request,
  allowed: readonly AdminRole[]
): Promise<AdminContext | Response> {
  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(db, sessionId) : null;
  if (!user) return jsonError(401, "No autenticado");

  const row = await db.prepare("SELECT role FROM users WHERE id = ?").bind(user.id).first<{ role: string }>();
  const role = row?.role ?? "player";
  if (!isAdminRole(role) || !hasRole(role, allowed)) return jsonError(403, "Sin permiso");

  if (!isSameOrigin(request)) return jsonError(403, "Origen no permitido");
  return { user, role };
}

export async function writeAudit(
  db: D1Database,
  userId: number,
  action: string,
  target?: string,
  detail?: unknown
): Promise<void> {
  await db
    .prepare("INSERT INTO admin_audit_log (user_id, action, target, detail) VALUES (?, ?, ?, ?)")
    .bind(userId, action, target ?? null, detail === undefined ? null : JSON.stringify(detail))
    .run();
}

/** Narrow an authorized request to an area. Returns a 403 Response, or null when allowed. */
export function denyUnlessRole(admin: AdminContext, allowed: readonly AdminRole[]): Response | null {
  return hasRole(admin.role, allowed) ? null : jsonError(403, "Sin permiso para esta sección");
}
