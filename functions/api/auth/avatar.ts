import { getSessionCookie, verifySession, type Env } from "../../lib/auth";

// Keep in sync with src/lib/avatars.ts (the files live in public/avatars/).
export const AVATAR_IDS = ["avatar-1", "avatar-2", "avatar-3"] as const;

interface AvatarBody {
  avatar?: string | null;
}

// PATCH { avatar: "avatar-1" | "avatar-2" | "avatar-3" | null } — null goes
// back to showing the username initial.
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: AvatarBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const avatar = body.avatar ?? null;
  if (avatar !== null && !(AVATAR_IDS as readonly string[]).includes(avatar)) {
    return Response.json({ error: "Avatar no válido" }, { status: 400 });
  }

  await env.DB.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(avatar, user.id).run();

  return Response.json({ avatar });
};
