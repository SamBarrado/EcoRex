import { deleteSession, getSessionCookie, clearSessionCookie, type Env } from "../../lib/auth";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  if (sessionId) {
    await deleteSession(env.DB, sessionId);
  }

  const secure = new URL(request.url).protocol === "https:";

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie(secure),
    },
  });
};
