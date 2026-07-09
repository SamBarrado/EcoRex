import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../functions/lib/webPush', () => ({
  sendWebPush: vi.fn(async () => ({ ok: true, statusCode: 201 })),
}));

import { sendWebPush } from '../../../functions/lib/webPush';
import worker from './index';

function makeDb(opts: {
  energyRows: Array<{ id: number; energy_count: number; energy_window_start: number | null; unlimited_energy: number; energy_full_notified_at: number | null; max_energy: number }>;
  subscriptionsByUser: Record<number, Array<{ endpoint: string; p256dh: string; auth: string }>>;
}) {
  const calls: { sql: string; args: unknown[] }[] = [];
  return {
    calls,
    db: {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            calls.push({ sql, args });
            return this;
          },
          async all<T>() {
            if (sql.includes('FROM users')) return { results: opts.energyRows as unknown as T[] };
            if (sql.includes('FROM push_subscriptions')) {
              const userId = calls[calls.length - 1].args[0] as number;
              return { results: (opts.subscriptionsByUser[userId] ?? []) as unknown as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            return {};
          },
        };
      },
    } as unknown as D1Database,
  };
}

describe('scheduled handler', () => {
  it('sends a push to each subscription of a fully-charged user and marks them notified', async () => {
    const { db, calls } = makeDb({
      energyRows: [
        { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_full_notified_at: null, max_energy: 3 },
      ],
      subscriptionsByUser: { 1: [{ endpoint: 'https://push.example/a', p256dh: 'p', auth: 'a' }] },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext);

    expect(sendWebPush).toHaveBeenCalledWith(
      { endpoint: 'https://push.example/a', p256dh: 'p', auth: 'a' },
      expect.objectContaining({ title: expect.any(String) }),
      expect.objectContaining({ publicKey: 'pub', privateKey: 'priv' })
    );
    expect(calls.some((c) => c.sql.includes('UPDATE users SET energy_full_notified_at'))).toBe(true);
  });

  it('deletes the subscription when the push endpoint reports it is gone', async () => {
    vi.mocked(sendWebPush).mockResolvedValueOnce({ ok: false, statusCode: 410 });
    const { db, calls } = makeDb({
      energyRows: [
        { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_full_notified_at: null, max_energy: 3 },
      ],
      subscriptionsByUser: { 1: [{ endpoint: 'https://push.example/gone', p256dh: 'p', auth: 'a' }] },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext);

    expect(calls.some((c) => c.sql.includes('DELETE FROM push_subscriptions'))).toBe(true);
  });
});
