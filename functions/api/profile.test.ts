import { describe, it, expect } from 'vitest';
import { onRequestGet } from './profile';

function makeDb(opts: { xp: number }) {
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000 };
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          if (sql.includes('xp FROM users')) return { xp: opts.xp } as unknown as T;
          if (sql.includes('MAX(launch_wave)')) return { wave: 1 } as unknown as T;
          if (sql.includes('COUNT(*) as count FROM species')) return { count: 10 } as unknown as T;
          if (sql.includes('COUNT(DISTINCT species_id)')) return { count: 3 } as unknown as T;
          if (sql.includes('COUNT(*) as count FROM discoveries')) return { count: 5 } as unknown as T;
          return null;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
      };
    },
  } as unknown as D1Database;
}

describe('GET /api/profile', () => {
  it('returns xp/level fields and no explorerRank', async () => {
    const request = new Request('https://ecorex.app/api/profile', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const env = { DB: makeDb({ xp: 150 }) };
    const response = await onRequestGet({ request, env } as never);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.xp).toBe(150);
    expect(body.level).toBe(3);
    expect(body.xpIntoLevel).toBe(9);
    expect(body.xpForNextLevel).toBe(119);
    expect(body.explorerRank).toBeUndefined();
  });
});
