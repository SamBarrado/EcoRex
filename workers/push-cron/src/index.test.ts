import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../functions/lib/webPush', () => ({
  sendWebPush: vi.fn(async () => ({ ok: true, statusCode: 201 })),
}));

import { sendWebPush } from '../../../functions/lib/webPush';
import worker from './index';

function makeDb(opts: {
  energyRows: Array<{
    id: number;
    energy_count: number;
    energy_window_start: number | null;
    unlimited_energy: number;
    energy_last_notified_count: number;
    xp: number;
  }>;
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
  it('sends a push to each subscription of a user who gained energy, marks them notified, and writes an in-app notification', async () => {
    const { db, calls } = makeDb({
      energyRows: [
        { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 0, xp: 0 },
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
    const update = calls.find((c) => c.sql.includes('UPDATE users SET energy_last_notified_count'));
    expect(update?.args).toEqual([3, 1]);

    const notificationInsert = calls.find((c) => c.sql.includes('INSERT INTO notifications'));
    expect(notificationInsert?.args[0]).toBe(1);
    expect(notificationInsert?.args[1]).toBe('energy_available');
    const payload = JSON.parse(notificationInsert?.args[2] as string);
    expect(payload).toEqual({ remaining: 3, max: 3 });
  });

  it('deletes the subscription when the push endpoint reports it is gone, but still writes the in-app notification', async () => {
    vi.mocked(sendWebPush).mockResolvedValueOnce({ ok: false, statusCode: 410 });
    const { db, calls } = makeDb({
      energyRows: [
        { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 0, xp: 0 },
      ],
      subscriptionsByUser: { 1: [{ endpoint: 'https://push.example/gone', p256dh: 'p', auth: 'a' }] },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext);

    expect(calls.some((c) => c.sql.includes('DELETE FROM push_subscriptions'))).toBe(true);
    expect(calls.some((c) => c.sql.includes('INSERT INTO notifications'))).toBe(true);
  });

  it('continues processing remaining subscriptions and users when sendWebPush throws for one subscription', async () => {
    vi.mocked(sendWebPush).mockClear();
    vi.mocked(sendWebPush).mockRejectedValueOnce(new Error('boom'));
    const { db, calls } = makeDb({
      energyRows: [
        { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 0, xp: 0 },
        { id: 2, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 0, xp: 0 },
      ],
      subscriptionsByUser: {
        1: [
          { endpoint: 'https://push.example/bad', p256dh: 'p', auth: 'a' },
          { endpoint: 'https://push.example/good', p256dh: 'p', auth: 'a' },
        ],
        2: [{ endpoint: 'https://push.example/user2', p256dh: 'p', auth: 'a' }],
      },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await expect(
      worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext)
    ).resolves.toBeUndefined();

    expect(sendWebPush).toHaveBeenCalledTimes(3);
    expect(sendWebPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/good' }),
      expect.anything(),
      expect.anything()
    );
    expect(sendWebPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/user2' }),
      expect.anything(),
      expect.anything()
    );
    const updateCalls = calls.filter((c) => c.sql.includes('UPDATE users SET energy_last_notified_count'));
    expect(updateCalls.map((c) => c.args[1])).toEqual([1, 2]);
    const notificationInserts = calls.filter((c) => c.sql.includes('INSERT INTO notifications'));
    expect(notificationInserts.map((c) => c.args[0])).toEqual([1, 2]);
  });

  it('does not re-notify a level>=5 user already notified up to 3 until they gain their real 4th point', async () => {
    vi.mocked(sendWebPush).mockClear();
    const { db, calls } = makeDb({
      // xp: 400 === xpForLevel(5), so this user is level 5 -> real max_energy is 4, not 3.
      // energy_window_start ~ now so ticks elapsed is ~0 and energy_count reflects the stored value.
      // Already notified up to 3 (their prior point); no new point gained yet.
      energyRows: [
        { id: 1, energy_count: 3, energy_window_start: Date.now(), unlimited_energy: 0, energy_last_notified_count: 3, xp: 400 },
      ],
      subscriptionsByUser: { 1: [{ endpoint: 'https://push.example/level5', p256dh: 'p', auth: 'a' }] },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext);

    expect(sendWebPush).not.toHaveBeenCalled();
    expect(calls.some((c) => c.sql.includes('UPDATE users SET energy_last_notified_count'))).toBe(false);
  });

  it('notifies a level>=5 user once they gain a point toward their real max of 4 energy', async () => {
    vi.mocked(sendWebPush).mockClear();
    const { db, calls } = makeDb({
      energyRows: [
        { id: 1, energy_count: 4, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 0, xp: 400 },
      ],
      subscriptionsByUser: { 1: [{ endpoint: 'https://push.example/level5-full', p256dh: 'p', auth: 'a' }] },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext);

    expect(sendWebPush).toHaveBeenCalledTimes(1);
    const update = calls.find((c) => c.sql.includes('UPDATE users SET energy_last_notified_count'));
    expect(update?.args).toEqual([4, 1]);
  });

  it('does not send a push or write a notification for a user with no new energy point', async () => {
    vi.mocked(sendWebPush).mockClear();
    const { db, calls } = makeDb({
      energyRows: [
        // window_start ~ now => ~0 ticks elapsed => remaining stays at the stored
        // energy_count (2), not the max — distinct from window_start: null, which
        // means "already at max" in this model.
        { id: 1, energy_count: 2, energy_window_start: Date.now(), unlimited_energy: 0, energy_last_notified_count: 2, xp: 0 },
      ],
      subscriptionsByUser: { 1: [{ endpoint: 'https://push.example/steady', p256dh: 'p', auth: 'a' }] },
    });

    const env = { DB: db, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
    await worker.scheduled({} as ScheduledController, env as never, {} as ExecutionContext);

    expect(sendWebPush).not.toHaveBeenCalled();
    expect(calls.some((c) => c.sql.includes('INSERT INTO notifications'))).toBe(false);
  });
});
