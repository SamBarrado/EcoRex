import { getSessionCookie, verifySession, type Env } from '../../lib/auth';
import { claimOnboardingReward } from '../../lib/onboarding';

// POST: collect the "Primeros pasos" prize. The server re-checks every step, so
// the client cannot claim early; a second call (or a double tap) pays nothing.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const reward = await claimOnboardingReward(env.DB, user.id);
  if (!reward) return Response.json({ claimed: false });
  return Response.json({ claimed: true, xp: reward.xp });
};
