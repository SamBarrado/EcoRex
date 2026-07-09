import { describe, it, expect, vi } from 'vitest';
import { onRequestPost as subscribe } from './subscribe';
import { onRequestPost as unsubscribe } from './unsubscribe';
import { onRequestGet as vapidPublicKey } from './vapid-public-key';

function makeDb() {
  const calls: { sql: string; args: unknown[] }[] = [];
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000, xp: 0 };
  return {
    calls,
    db: {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            calls.push({ sql, args });
            return this;
          },
          async first<T>() {
            if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
            return null;
          },
          async run() {
            return {};
          },
        };
      },
    } as unknown as D1Database,
  };
}

describe('POST /api/push/subscribe', () => {
  it('rejects unauthenticated requests', async () => {
    const { db } = makeDb();
    const request = new Request('https://ecorex.app/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }),
    });
    const response = await subscribe({ request, env: { DB: db } } as never);
    expect(response.status).toBe(401);
  });

  it('upserts the subscription for the authenticated user', async () => {
    const { db, calls } = makeDb();
    const request = new Request('https://ecorex.app/api/push/subscribe', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }),
    });
    const response = await subscribe({ request, env: { DB: db } } as never);
    expect(response.status).toBe(200);
    expect(calls.some((c) => c.sql.includes('INSERT INTO push_subscriptions'))).toBe(true);
  });
});

describe('POST /api/push/unsubscribe', () => {
  it('deletes the subscription by endpoint', async () => {
    const { db, calls } = makeDb();
    const request = new Request('https://ecorex.app/api/push/unsubscribe', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ endpoint: 'https://push.example/x' }),
    });
    const response = await unsubscribe({ request, env: { DB: db } } as never);
    expect(response.status).toBe(200);
    expect(calls.some((c) => c.sql.includes('DELETE FROM push_subscriptions'))).toBe(true);
  });
});

describe('GET /api/push/vapid-public-key', () => {
  it('returns the configured public key', async () => {
    const response = await vapidPublicKey({ env: { VAPID_PUBLIC_KEY: 'pub-key' } } as never);
    const body = (await response.json()) as { publicKey: string };
    expect(body.publicKey).toBe('pub-key');
  });
});
