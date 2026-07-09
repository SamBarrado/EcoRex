import { sendWebPush } from '../../../functions/lib/webPush';
import { selectUsersToNotify, type EnergyRow } from './selectUsersToNotify';

interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const BASE_MAX_ENERGY = 3;

// Mirrors functions/lib/xp.ts's levelFromXp/energyBonusForLevel — keep in sync,
// no shared package between these two Wrangler projects.
const ENERGY_BONUS_LEVEL_1 = 5;
const ENERGY_BONUS_LEVEL_2 = 30;

function xpForLevel(level: number): number {
  return Math.round(50 * Math.pow(level - 1, 1.5));
}

function maxEnergyForXp(xp: number): number {
  let bonus = 0;
  if (xp >= xpForLevel(ENERGY_BONUS_LEVEL_1)) bonus += 1;
  if (xp >= xpForLevel(ENERGY_BONUS_LEVEL_2)) bonus += 1;
  return BASE_MAX_ENERGY + bonus;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = Date.now();

    const { results } = await env.DB.prepare(
      `SELECT id, energy_count, energy_window_start, unlimited_energy, energy_full_notified_at, xp
       FROM users WHERE unlimited_energy = 0 AND energy_full_notified_at IS NULL`
    ).all<Omit<EnergyRow, 'max_energy'> & { xp: number }>();

    const rows: EnergyRow[] = results.map((row) => ({ ...row, max_energy: maxEnergyForXp(row.xp) }));
    const userIds = selectUsersToNotify(rows, now);

    for (const userId of userIds) {
      const { results: subscriptions } = await env.DB.prepare(
        `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`
      )
        .bind(userId)
        .all<SubscriptionRow>();

      for (const subscription of subscriptions) {
        try {
          const result = await sendWebPush(
            subscription,
            { title: 'Energía lista', body: 'Ya puedes descubrir una nueva especie.', url: '/' },
            { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: 'mailto:hola@ecorex.app' }
          );

          if (result.statusCode === 404 || result.statusCode === 410) {
            await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(subscription.endpoint).run();
          }
        } catch (err) {
          // A single bad subscription (malformed key, network error, etc.) must not
          // abort the loop: that would silently skip remaining subscriptions for this
          // user, the energy_full_notified_at UPDATE below, and every subsequent user
          // in userIds. Skip it (no delete — an exception isn't a confirmed 404/410)
          // and keep going.
          console.error('sendWebPush failed for subscription', subscription.endpoint, err);
        }
      }

      await env.DB.prepare(`UPDATE users SET energy_full_notified_at = ? WHERE id = ?`).bind(now, userId).run();
    }
  },
};
