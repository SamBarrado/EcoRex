import { getSessionCookie, verifySession, type Env } from "../lib/auth";
import { getEnergyState, MAX_ENERGY } from "../lib/energy";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const state = await getEnergyState(env.DB, user.id);

  return Response.json({
    remaining: state.remaining,
    max: MAX_ENERGY,
    resetAt: state.resetAt,
    unlimited: state.unlimited ?? false,
  });
};
