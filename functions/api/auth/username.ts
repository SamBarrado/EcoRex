import { getSessionCookie, verifySession, type Env } from "../../lib/auth";

interface UsernameBody {
  display_name?: string;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: UsernameBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName = body.display_name?.trim() ?? "";
  if (!USERNAME_PATTERN.test(displayName)) {
    return Response.json(
      { error: "El nombre de usuario debe tener 3-20 caracteres (letras, números o _)" },
      { status: 400 }
    );
  }

  const existingUsername = await env.DB.prepare(
    "SELECT id FROM users WHERE display_name = ? AND id != ?"
  )
    .bind(displayName, user.id)
    .first();
  if (existingUsername) {
    return Response.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
  }

  await env.DB.prepare(
    "UPDATE users SET display_name = ?, needs_username_setup = 0 WHERE id = ?"
  )
    .bind(displayName, user.id)
    .run();

  return Response.json({
    user: { id: user.id, email: user.email, display_name: displayName, needs_username_setup: false },
  });
};
