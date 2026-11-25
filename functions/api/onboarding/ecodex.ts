import { getSessionCookie, verifySession, type Env } from '../../lib/auth';
import { markEcodexVisited } from '../../lib/onboarding';

// POST: the player opened the EcoDex (the "Visitar tu EcoDex" step has no data of its own).
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  await markEcodexVisited(env.DB, user.id);
  return Response.json({ ok: true });
};
