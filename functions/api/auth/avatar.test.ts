import { describe, it, expect, vi } from 'vitest';
import { onRequestPatch } from './avatar';

function makeDb(authenticated = true) {
  const run = vi.fn(async () => ({}));
  const binds: unknown[][] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          binds.push(args);
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions') && authenticated) {
            return { id: 7, email: 'a@a.com', display_name: 'A', xp: 0, avatar: null, expires_at: Date.now() + 100000 } as unknown as T;
          }
          return null;
        },
        run,
      };
    },
  } as unknown as D1Database;
  return { db, run, binds };
}

function patch(db: D1Database, body: unknown, cookie = 'ecorex_session=abc') {
  const request = new Request('https://ecorex.app/api/auth/avatar', {
    method: 'PATCH',
    headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return onRequestPatch({ request, env: { DB: db } } as never);
}

describe('PATCH /api/auth/avatar', () => {
  it('rejects unauthenticated requests', async () => {
    const { db, run } = makeDb(false);
    const response = await patch(db, { avatar: 'avatar-1' });
    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects ids that are not one of the default avatars', async () => {
    const { db, run } = makeDb();
    const response = await patch(db, { avatar: '../../etc/passwd' });
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    const { db } = makeDb();
    const response = await patch(db, '{nope');
    expect(response.status).toBe(400);
  });

  it('saves a valid avatar for the session user', async () => {
    const { db, run, binds } = makeDb();
    const response = await patch(db, { avatar: 'avatar-2' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ avatar: 'avatar-2' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(binds[binds.length - 1]).toEqual(['avatar-2', 7]);
  });

  it('accepts null to go back to the initial', async () => {
    const { db, binds } = makeDb();
    const response = await patch(db, { avatar: null });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ avatar: null });
    expect(binds[binds.length - 1]).toEqual([null, 7]);
  });
});
