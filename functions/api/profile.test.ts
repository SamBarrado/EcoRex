import { describe, it, expect } from 'vitest';
import { onRequestGet } from './profile';

function makeDb(opts: { xp: number }) {
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000, xp: opts.xp };
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          if (sql.includes('xp FROM users')) return { xp: opts.xp } as unknown as T;
          // Playable species only (the "???" placeholders are is_active = 0).
          if (sql.includes('COUNT(*) as count FROM species WHERE is_active = 1')) return { count: 6 } as unknown as T;
          if (sql.includes('COUNT(DISTINCT discoveries.species_id)')) return { count: 3 } as unknown as T;
          if (sql.includes('FROM species_phase_anchors')) return { count: 18 } as unknown as T;
          if (sql.includes('SELECT DISTINCT discoveries.species_id, discoveries.phase')) return { count: 5 } as unknown as T;
          if (sql.includes('SUM(copies - 1)')) return { count: 2 } as unknown as T;
          if (sql.includes('SELECT COUNT(*) as count FROM discoveries WHERE user_id')) return { count: 9 } as unknown as T;
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
    expect(body.title).toBe('Explorador Novato');
  });

  it('reports species, registries (EcoDex entries), cards and repeated cards as separate units', async () => {
    const request = new Request('https://ecorex.app/api/profile', { headers: { Cookie: 'ecorex_session=abc' } });
    const response = await onRequestGet({ request, env: { DB: makeDb({ xp: 0 }) } } as never);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.speciesDiscoveredCount).toBe(3);
    expect(body.speciesTotalCount).toBe(6);
    expect(body.registeredCount).toBe(5);
    expect(body.registeredTotalCount).toBe(18);
    expect(body.totalDiscoveries).toBe(9);
    expect(body.repeatedCount).toBe(2);
    expect(body.duplicateCount).toBeUndefined();
  });
});
