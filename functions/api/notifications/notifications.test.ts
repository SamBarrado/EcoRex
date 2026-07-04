import { describe, it, expect } from 'vitest';
import { onRequestGet } from './index';
import { onRequestPost } from './[id]/read';

function makeEnv(opts: { rows?: unknown[]; ownerId?: number | null } = {}) {
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000 };
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          if (sql.includes('SELECT user_id FROM notifications')) {
            return (opts.ownerId === undefined ? { user_id: 1 } : opts.ownerId === null ? null : { user_id: opts.ownerId }) as unknown as T;
          }
          return null;
        },
        async all<T>() {
          return { results: (opts.rows ?? []) as T[] };
        },
        async run() {
          return { meta: { last_row_id: 1 } };
        },
      };
    },
    calls,
  };
  return {
    DB: db as unknown as D1Database,
  };
}

describe('GET /api/notifications', () => {
  it('returns 401 without a session', async () => {
    const env = makeEnv();
    const request = new Request('https://ecorex.app/api/notifications');
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(401);
  });

  it('returns the list for the authenticated user', async () => {
    const env = makeEnv({
      rows: [{ id: 1, type: 'fusion_ready', payload: '{"speciesId":7}', read_at: null, created_at: '2026-07-05' }],
    });
    const request = new Request('https://ecorex.app/api/notifications', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      notifications: { type: string; payload: unknown }[];
    };
    expect(body.notifications[0].type).toBe('fusion_ready');
    expect(body.notifications[0].payload).toEqual({ speciesId: 7 });
  });
});

describe('POST /api/notifications/:id/read', () => {
  it('returns 404 when the notification belongs to another user', async () => {
    const env = makeEnv({ ownerId: 2 });
    const request = new Request('https://ecorex.app/api/notifications/1/read', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestPost({ request, env, params: { id: '1' } } as never);
    expect(response.status).toBe(404);
  });

  it('marks the notification read for its owner', async () => {
    const env = makeEnv({ ownerId: 1 });
    const request = new Request('https://ecorex.app/api/notifications/1/read', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestPost({ request, env, params: { id: '1' } } as never);
    expect(response.status).toBe(200);
  });
});
