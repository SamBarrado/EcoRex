// Deny-by-default gate for every /api/admin/* route. A new endpoint is protected
// without having to remember anything; endpoints narrow further by area with
// hasRole(context.data.role, [...]).
import { ADMIN_ROLES, authorize, isSameOrigin, jsonError, type AdminContext, type AdminEnv } from "../../lib/adminAuth";

const PUBLIC_PATHS = new Set(["/api/admin/login"]);

export const onRequest: PagesFunction<AdminEnv, any, { admin: AdminContext }> = async (context) => {
  const { request, env, next } = context;
  const path = new URL(request.url).pathname.replace(/\/+$/, "");

  if (PUBLIC_PATHS.has(path)) {
    if (!isSameOrigin(request)) return jsonError(403, "Origen no permitido");
    return next();
  }

  const result = await authorize(env.DB, request, ADMIN_ROLES);
  if (result instanceof Response) return result;
  context.data.admin = result;
  return next();
};
