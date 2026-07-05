import { describe, it, expect } from 'vitest';
import { onRequestPost } from './discover';

function makeDb(opts: { calmaCountAfterInsert: number; xp?: number; ownedPhases?: string[] }) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000 };
  const speciesRow = {
    species_id: 7,
    scientific_name: 'Tyrannosaurus imperator',
    common_name: 'Rex de Fuego',
    physical_traits: null,
    base_palette: null,
    silhouette: null,
    fractae_child_name: 'Calma',
    anchor_image_url: '/species-art/rex/calma.png',
  };
  let currentXp = opts.xp ?? 0;
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          if (sql.includes('FROM species')) return speciesRow as unknown as T;
          if (sql.includes('SELECT discovered_at')) return { discovered_at: '2026-07-05' } as unknown as T;
          if (sql.includes('COUNT(*) as calma_count')) return { calma_count: opts.calmaCountAfterInsert } as unknown as T;
          if (sql.includes('SELECT xp FROM users')) return { xp: currentXp } as unknown as T;
          return null;
        },
        async all<T>() {
          if (sql.includes('rarity_tiers')) {
            return { results: [{ id: 1, slug: 'registrada', name: 'Registrada', anchor_probability: 1, drop_weight: 100 }] as T[] };
          }
          if (sql.includes('DISTINCT phase')) {
            return { results: (opts.ownedPhases ?? []).map((phase) => ({ phase })) as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (sql.includes('UPDATE users SET xp')) {
            currentXp += Number(calls[calls.length - 1].args[0]);
          }
          return { meta: { last_row_id: 99 } };
        },
      };
    },
    calls,
  };
  return db;
}

describe('POST /api/discover', () => {
  it('rejects phase=exceso', async () => {
    const db = makeDb({ calmaCountAfterInsert: 1 });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'exceso' }),
    });
    const env = {
      DB: db as unknown as D1Database,
      RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
      DINO_IMAGES: {} as unknown as R2Bucket,
      OPENAI_API_KEY: 'test-key',
    };
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(400);
  });

  it('inserts a fusion_ready notification when calma count reaches exactly 5', async () => {
    const db = makeDb({ calmaCountAfterInsert: 5 });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'calma' }),
    });
    const env = {
      DB: db as unknown as D1Database,
      RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
      DINO_IMAGES: {} as unknown as R2Bucket,
      OPENAI_API_KEY: 'test-key',
    };
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(201);
    const notifCall = db.calls.find((c) => c.sql.includes('INSERT INTO notifications'));
    expect(notifCall).toBeDefined();
    expect(notifCall!.args[1]).toBe('fusion_ready');
  });

  it('does not insert a notification when calma count is not exactly 5', async () => {
    const db = makeDb({ calmaCountAfterInsert: 6 });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'calma' }),
    });
    const env = {
      DB: db as unknown as D1Database,
      RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
      DINO_IMAGES: {} as unknown as R2Bucket,
      OPENAI_API_KEY: 'test-key',
    };
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(201);
    const notifCall = db.calls.find((c) => c.sql.includes('INSERT INTO notifications'));
    expect(notifCall).toBeUndefined();
  });

  it('includes an xp block with rarity-based xp in the response', async () => {
    const db = makeDb({ calmaCountAfterInsert: 1, xp: 0, ownedPhases: [] });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'calma' }),
    });
    const env = {
      DB: db as unknown as D1Database,
      RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
      DINO_IMAGES: {} as unknown as R2Bucket,
      OPENAI_API_KEY: 'test-key',
    };
    const response = await onRequestPost({ request, env } as never);
    const body = (await response.json()) as { xp: { xpGained: number; totalXp: number; level: number; leveledUp: boolean } };
    expect(body.xp.xpGained).toBe(10); // registrada is the only rarity tier in the fixture
    expect(body.xp.totalXp).toBe(10);
    expect(body.xp.leveledUp).toBe(false);
  });

  it('adds the species-complete bonus when this discovery finishes the set', async () => {
    const db = makeDb({ calmaCountAfterInsert: 1, xp: 0, ownedPhases: ['calma', 'exceso', 'eco'] });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'eco' }),
    });
    const env = {
      DB: db as unknown as D1Database,
      RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
      DINO_IMAGES: {} as unknown as R2Bucket,
      OPENAI_API_KEY: 'test-key',
    };
    const response = await onRequestPost({ request, env } as never);
    const body = (await response.json()) as { xp: { xpGained: number } };
    expect(body.xp.xpGained).toBe(10 + 200); // rarity xp + species-complete bonus
  });
});
