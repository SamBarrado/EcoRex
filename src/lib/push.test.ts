import { describe, it, expect, vi, beforeEach } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('decodes a URL-safe base64 VAPID key into a Uint8Array', () => {
    // "AAECAw" (base64url) decodes to bytes [0, 1, 2, 3]
    const result = urlBase64ToUint8Array('AAECAw==');
    expect(Array.from(result)).toEqual([0, 1, 2, 3]);
  });
});

import { hasActivePushSubscription, subscribeToPush } from './push';

function stubBrowser(opts: { subscription?: unknown; permission?: string; fetchImpl?: typeof fetch }) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(opts.subscription ?? null),
    subscribe: vi.fn().mockResolvedValue({
      unsubscribe: vi.fn().mockResolvedValue(true),
      toJSON: () => ({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }),
    }),
  };
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ pushManager }) } });
  vi.stubGlobal('Notification', { permission: opts.permission ?? 'granted', requestPermission: vi.fn().mockResolvedValue(opts.permission ?? 'granted') });
  if (opts.fetchImpl) vi.stubGlobal('fetch', opts.fetchImpl);
  return pushManager;
}

describe('hasActivePushSubscription', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('is false when permission is granted but there is no subscription (e.g. after unsubscribing)', async () => {
    stubBrowser({ permission: 'granted', subscription: null });
    expect(await hasActivePushSubscription()).toBe(false);
  });

  it('is true when a subscription exists', async () => {
    stubBrowser({ subscription: { endpoint: 'x' } });
    expect(await hasActivePushSubscription()).toBe(true);
  });
});

describe('subscribeToPush', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('throws a clear error when the server has no VAPID public key', async () => {
    stubBrowser({ fetchImpl: vi.fn().mockResolvedValue(Response.json({})) as never });
    await expect(subscribeToPush()).rejects.toThrow(/VAPID/);
  });

  it('throws when the server rejects the subscription', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ publicKey: 'AAECAw' }))
      .mockResolvedValueOnce(new Response('x', { status: 500 }));
    stubBrowser({ fetchImpl: fetchImpl as never });
    await expect(subscribeToPush()).rejects.toThrow(/suscripci/i);
  });
});
