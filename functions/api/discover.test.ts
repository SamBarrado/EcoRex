import { describe, it, expect } from 'vitest';
import { onRequestPost } from './discover';

function makeDb(opts: {
  balanceCountAfterInsert: number;
  xp?: number;
  /** Legacy single fixture: phases owned both before and after the insert. */
  ownedPhases?: string[];
  /** Phases owned before this action's INSERT. */
  ownedPhasesBefore?: string[];
  /** Phases owned after this action's INSERT (defaults to ownedPhasesBefore). */
  ownedPhasesAfter?: string[];
}) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000 };
  const speciesRow = {
    species_id: 7,
    scientific_name: 'Tyrannosaurus imperator',
    common_name: 'Rex de Fuego',
    physical_traits: null,
    base_palette: null,
    silhouette: null,
    fractae_child_name: 'Furia',
    anchor_image_url: '/species-art/rex/balance.png',
  };
  let currentXp = opts.xp ?? 0;
  let insertDone = false;
  const phasesBefore = opts.ownedPhasesBefore ?? opts.ownedPhases ?? [];
  const phasesAfter = opts.ownedPhasesAfter ?? opts.ownedPhasesBefore ?? opts.ownedPhases ?? [];
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
          if (sql.includes('COUNT(*) as balance_count')) return { balance_count: opts.balanceCountAfterInsert } as unknown as T;
          if (sql.includes('SELECT xp FROM users')) return { xp: currentXp } as unknown as T;
          return null;
        },
        async all<T>() {
          if (sql.includes('rarity_tiers')) {
            return { results: [{ id: 1, slug: 'registrada', name: 'Registrada', anchor_probability: 1, drop_weight: 100 }] as T[] };
          }
          if (sql.includes('DISTINCT phase')) {
            const phases = insertDone ? phasesAfter : phasesBefore;
            return { results: phases.map((phase) => ({ phase })) as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (sql.includes('INSERT INTO discoveries')) {
            insertDone = true;
          }
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
    const db = makeDb({ balanceCountAfterInsert: 1 });
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

  it('inserts a fusion_ready notification when balance count reaches exactly 5', async () => {
    const db = makeDb({ balanceCountAfterInsert: 5 });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'balance' }),
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

  it('does not insert a notification when balance count is not exactly 5', async () => {
    const db = makeDb({ balanceCountAfterInsert: 6 });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'balance' }),
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
    const db = makeDb({ balanceCountAfterInsert: 1, xp: 0, ownedPhases: [] });
    const request = new Request('https://ecorex.app/api/discover', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7, phase: 'balance' }),
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
    // Before this insert the user only owns balance+exceso; the eco discovery
    // being made right now is what completes the set for the first time.
    const db = makeDb({
      balanceCountAfterInsert: 1,
      xp: 0,
      ownedPhasesBefore: ['balance', 'exceso'],
      ownedPhasesAfter: ['balance', 'exceso', 'eco'],
    });
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

  it('does NOT re-award the species-complete bonus when the species was already complete before this action', async () => {
    // The user already owns balance+exceso+eco for this species (including a
    // prior eco). This discovery is a duplicate eco — the set was already
    // complete before the insert, so no bonus should be granted again.
    const db = makeDb({
      balanceCountAfterInsert: 1,
      xp: 0,
      ownedPhasesBefore: ['balance', 'exceso', 'eco'],
      ownedPhasesAfter: ['balance', 'exceso', 'eco'],
    });
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
    expect(body.xp.xpGained).toBe(10); // rarity xp only, no species-complete bonus
  });
});
