import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestGet } from './eligible';
import { onRequestPost } from './index';

function makeDb(overrides: Partial<Record<string, unknown>> = {}) {
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
          return (overrides.first as T) ?? null;
        },
        async all<T>() {
          if (sql.includes('GROUP BY species.id')) {
            return { results: (overrides.eligibleRows ?? []) as T[] };
          }
          if (sql.includes('rarity_tiers')) {
            return {
              results: [
                { id: 1, slug: 'registrada', name: 'Registrada', anchor_probability: 1, drop_weight: 100 },
              ] as T[],
            };
          }
          if (sql.includes('ORDER BY discovered_at ASC')) {
            return { results: (overrides.oldestRows ?? []) as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          return { meta: { last_row_id: 42 } };
        },
      };
    },
    calls,
  };
  return db;
}

function makeEnv(dbOverrides: Partial<Record<string, unknown>> = {}) {
  const db = makeDb(dbOverrides);
  return {
    env: {
      DB: db as unknown as D1Database,
      RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
      DINO_IMAGES: {} as unknown as R2Bucket,
      OPENAI_API_KEY: 'test-key',
    },
    db,
  };
}

describe('GET /api/fuse/eligible', () => {
  it('returns 401 without a session cookie', async () => {
    const { env } = makeEnv();
    const request = new Request('https://ecorex.app/api/fuse/eligible');
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(401);
  });

  it('returns species with 5+ non-consumed calma duplicates', async () => {
    const { env } = makeEnv({
      eligibleRows: [
        {
          species_id: 7,
          common_name: 'Rex de Fuego',
          scientific_name: 'Tyrannosaurus imperator',
          calma_anchor_url: '/species-art/rex/calma.png',
          calma_count: 5,
        },
      ],
    });
    const request = new Request('https://ecorex.app/api/fuse/eligible', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { eligible: unknown };
    expect(body.eligible).toEqual([
      {
        speciesId: 7,
        commonName: 'Rex de Fuego',
        scientificName: 'Tyrannosaurus imperator',
        calmaAnchorUrl: '/species-art/rex/calma.png',
        calmaCount: 5,
      },
    ]);
  });
});

describe('POST /api/fuse', () => {
  it('returns 401 without a session cookie', async () => {
    const { env } = makeEnv();
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(401);
  });

  it('returns 409 when fewer than 5 non-consumed duplicates exist', async () => {
    const { env } = makeEnv({ oldestRows: [{ id: 1 }, { id: 2 }] });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(409);
  });

  it('fuses 5 oldest duplicates and returns a new furia discovery', async () => {
    const { env, db } = makeEnv({
      oldestRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      first: {
        species_id: 7,
        scientific_name: 'Tyrannosaurus imperator',
        common_name: 'Rex de Fuego',
        physical_traits: null,
        base_palette: null,
        silhouette: null,
        fractae_child_name: 'Furia',
        anchor_image_url: '/species-art/rex/furia.png',
      },
    });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(201);
    const body = (await response.json()) as { phase: string; commonName: string };
    expect(body.phase).toBe('furia');
    expect(body.commonName).toBe('Rex de Fuego');
    const updateCalls = db.calls.filter((c) => c.sql.includes('SET consumed_at'));
    expect(updateCalls.length).toBeGreaterThan(0);
  });
});
