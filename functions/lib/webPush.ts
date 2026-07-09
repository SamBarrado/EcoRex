import { buildPushPayload } from '@block65/webcrypto-web-push';

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export async function sendWebPush(
  subscription: PushSubscriptionKeys,
  payload: PushPayload,
  vapid: VapidConfig
): Promise<{ ok: boolean; statusCode: number }> {
  const message = await buildPushPayload(
    { data: JSON.stringify(payload), options: { ttl: 60 } },
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey }
  );

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: message.headers as Record<string, string>,
    body: message.body as BodyInit,
  });

  return { ok: response.ok, statusCode: response.status };
}
