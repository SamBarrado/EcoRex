import { getSessionCookie, verifySession } from "../../../lib/auth";

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const notificationId = Number(params.id);
  if (!Number.isInteger(notificationId)) {
    return Response.json({ error: "Invalid notification id" }, { status: 400 });
  }

  const owner = await env.DB.prepare("SELECT user_id FROM notifications WHERE id = ?")
    .bind(notificationId)
    .first<{ user_id: number }>();

  if (!owner || owner.user_id !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await env.DB.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ?")
    .bind(notificationId)
    .run();

  return Response.json({ ok: true });
};
