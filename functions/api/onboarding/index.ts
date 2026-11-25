import { getSessionCookie, verifySession, type Env } from '../../lib/auth';
import { getOnboardingState } from '../../lib/onboarding';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  return Response.json(await getOnboardingState(env.DB, user.id));
};
