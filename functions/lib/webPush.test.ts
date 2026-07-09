import { describe, it, expect, vi } from 'vitest';

vi.mock('@block65/webcrypto-web-push', () => ({
  buildPushPayload: vi.fn(async () => ({
    headers: {
      'content-encoding': 'aes128gcm',
      'content-length': '3',
      'content-type': 'application/octet-stream',
      'crypto-key': 'dh=x',
      encryption: 'salt=y',
      ttl: '60',
      authorization: 'vapid t=x, k=y',
    },
    method: 'post',
    body: new Uint8Array([1, 2, 3]),
  })),
}));

import { sendWebPush } from './webPush';

describe('sendWebPush', () => {
  it('posts the built payload to the subscription endpoint and reports success', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendWebPush(
      { endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a' },
      { title: 'Energía lista', body: 'Ya puedes descubrir de nuevo', url: '/' },
      { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:test@ecorex.app' }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://push.example/abc',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual({ ok: true, statusCode: 201 });

    vi.unstubAllGlobals();
  });

  it('reports failure with the status code on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 410 })));

    const result = await sendWebPush(
      { endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a' },
      { title: 'x', body: 'y', url: '/' },
      { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:test@ecorex.app' }
    );

    expect(result).toEqual({ ok: false, statusCode: 410 });

    vi.unstubAllGlobals();
  });
});
