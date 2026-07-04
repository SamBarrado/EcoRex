import { getSessionCookie, verifySession } from "../../lib/auth";

interface Env {
  DB: D1Database;
}

interface NotificationRow {
  id: number;
  type: string;
  payload: string | null;
  read_at: string | null;
  created_at: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, type, payload, read_at, created_at FROM notifications
     WHERE user_id = ?
     ORDER BY (read_at IS NULL) DESC, created_at DESC
     LIMIT 50`
  )
    .bind(user.id)
    .all<NotificationRow>();

  return Response.json({
    notifications: results.map((row) => ({
      id: row.id,
      type: row.type,
      payload: row.payload ? JSON.parse(row.payload) : null,
      readAt: row.read_at,
      createdAt: row.created_at,
    })),
  });
};
