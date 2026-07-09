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

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = Date.now();

    const { results } = await env.DB.prepare(
      `SELECT id, energy_count, energy_window_start, unlimited_energy, energy_full_notified_at
       FROM users WHERE unlimited_energy = 0 AND energy_full_notified_at IS NULL`
    ).all<Omit<EnergyRow, 'max_energy'>>();

    const rows: EnergyRow[] = results.map((row) => ({ ...row, max_energy: BASE_MAX_ENERGY }));
    const userIds = selectUsersToNotify(rows, now);

    for (const userId of userIds) {
      const { results: subscriptions } = await env.DB.prepare(
        `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`
      )
        .bind(userId)
        .all<SubscriptionRow>();

      for (const subscription of subscriptions) {
        const result = await sendWebPush(
          subscription,
          { title: 'Energía lista', body: 'Ya puedes descubrir una nueva especie.', url: '/' },
          { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: 'mailto:hola@ecorex.app' }
        );

        if (result.statusCode === 404 || result.statusCode === 410) {
          await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(subscription.endpoint).run();
        }
      }

      await env.DB.prepare(`UPDATE users SET energy_full_notified_at = ? WHERE id = ?`).bind(now, userId).run();
    }
  },
};
