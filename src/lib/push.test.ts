import { describe, it, expect, vi, beforeEach } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('decodes a URL-safe base64 VAPID key into a Uint8Array', () => {
    // "AAECAw" (base64url) decodes to bytes [0, 1, 2, 3]
    const result = urlBase64ToUint8Array('AAECAw==');
    expect(Array.from(result)).toEqual([0, 1, 2, 3]);
  });
});
