import { getSessionCookie, verifySession, type Env } from "../lib/auth";
import { getEnergyState } from "../lib/energy";
import { levelFromXp } from "../lib/xp";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const state = await getEnergyState(env.DB, user.id, levelFromXp(user.xp));

  return Response.json({
    remaining: state.remaining,
    max: state.max,
    resetAt: state.resetAt,
    unlimited: state.unlimited ?? false,
  });
};
