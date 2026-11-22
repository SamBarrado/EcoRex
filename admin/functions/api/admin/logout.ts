import { clearSessionCookie, deleteSession, getSessionCookie } from "../../../../functions/lib/auth";
import type { AdminEnv } from "../../lib/adminAuth";

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const sessionId = getSessionCookie(request);
  if (sessionId) await deleteSession(env.DB, sessionId);
  const secure = new URL(request.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie(secure) },
  });
};
