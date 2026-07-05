import { describe, it, expect } from 'vitest';
import { onRequestGet } from './mine';

function makeEnv() {
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
          return null;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
      };
    },
  };

  return {
    env: {
      DB: db as unknown as D1Database,
    },
    calls,
  };
}

describe('GET /api/collection/mine', () => {
  it('excludes consumed discoveries from the collection query', async () => {
    const { env, calls } = makeEnv();
    const request = new Request('https://example.com/api/collection/mine', {
      headers: { Cookie: 'ecorex_session=abc' },
    });

    await onRequestGet({ request, env } as unknown as Parameters<typeof onRequestGet>[0]);

    const collectionCall = calls.find((c) => c.sql.includes('FROM discoveries') && c.sql.includes('JOIN species'));
    expect(collectionCall).toBeDefined();
    expect(collectionCall!.sql).toContain('discoveries.consumed_at IS NULL');
  });
});
