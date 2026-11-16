import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestGet } from './eligible';
import { onRequestPost } from './index';

function makeDb(overrides: Partial<Record<string, unknown>> = {}) {
  const sessionRow = {
    id: 1,
    email: 'a@a.com',
    display_name: 'A',
    expires_at: Date.now() + 100000,
    xp: (overrides.xp as { xp: number } | undefined)?.xp ?? 0,
  };
  const calls: { sql: string; args: unknown[] }[] = [];
  let insertDone = false;
  const legacyOwned = (overrides.ownedPhases as string[] | undefined) ?? [];
  const phasesBefore = (overrides.ownedPhasesBefore as string[] | undefined) ?? legacyOwned;
  const phasesAfter = (overrides.ownedPhasesAfter as string[] | undefined) ?? phasesBefore;

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          if (sql.includes('SELECT xp FROM users')) return ((overrides.xp as { xp: number } | undefined) ?? { xp: 0 }) as unknown as T;
          if (sql.includes('SELECT progress_count, completed_at FROM daily_missions')) {
            const progress = (overrides.missionProgress as Record<string, { progress_count: number; completed_at: string | null }> | undefined) ?? {};
            const lastCall = calls[calls.length - 1];
            const slug = lastCall.args[1] as string;
            return (progress[slug] as unknown as T) ?? ({ progress_count: 0, completed_at: null } as unknown as T);
          }
          return (overrides.first as T) ?? null;
        },
        async all<T>() {
          if (sql.includes('GROUP BY species.id')) {
            return { results: (overrides.eligibleRows ?? []) as T[] };
          }
          if (sql.includes('rarity_tiers')) {
            return {
              results: [
                { id: 1, slug: 'registrada', name: 'Registrada', drop_weight: 100 },
              ] as T[],
            };
          }
          if (sql.includes('ORDER BY discovered_at ASC')) {
            return { results: (overrides.oldestRows ?? []) as T[] };
          }
          if (sql.includes('DISTINCT phase')) {
            const phases = insertDone ? phasesAfter : phasesBefore;
            return { results: phases.map((phase) => ({ phase })) as T[] };
          }
          if (sql.includes('SELECT mission_slug, completed_at FROM daily_missions')) {
            const progress = (overrides.missionProgress as Record<string, { progress_count: number; completed_at: string | null }> | undefined) ?? {};
            return {
              results: Object.entries(progress)
                .filter(([slug]) => slug !== 'bonus')
                .map(([mission_slug, row]) => ({ mission_slug, completed_at: row.completed_at })) as T[],
            };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (sql.includes('INSERT INTO discoveries')) {
            insertDone = true;
          }
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

  it('returns species with 5+ non-consumed balance duplicates', async () => {
    const { env } = makeEnv({
      eligibleRows: [
        {
          species_id: 7,
          common_name: 'Rex de Fuego',
          scientific_name: 'Tyrannosaurus imperator',
          balance_anchor_url: '/species-art/rex/balance.png',
          balance_count: 5,
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
        balanceAnchorUrl: '/species-art/rex/balance.png',
        balanceCount: 5,
      },
    ]);
  });

  it('includes a species with exactly 4 non-consumed duplicates for a level 15+ user', async () => {
    const { env, db } = makeEnv({
      xp: { xp: 2619 },
      eligibleRows: [
        {
          species_id: 7,
          common_name: 'Rex de Fuego',
          scientific_name: 'Tyrannosaurus imperator',
          balance_anchor_url: '/species-art/rex/balance.png',
          balance_count: 4,
        },
      ],
    });
    const request = new Request('https://ecorex.app/api/fuse/eligible', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { eligible: unknown[] };
    expect(body.eligible).toEqual([
      {
        speciesId: 7,
        commonName: 'Rex de Fuego',
        scientificName: 'Tyrannosaurus imperator',
        balanceAnchorUrl: '/species-art/rex/balance.png',
        balanceCount: 4,
      },
    ]);
    const eligibleQueryCall = db.calls.find((c) => c.sql.includes('GROUP BY species.id'));
    expect(eligibleQueryCall?.args).toEqual([1, 4]);
  });

  it('excludes a species with only 4 non-consumed duplicates for a level 1 user', async () => {
    const { env, db } = makeEnv({
      xp: { xp: 0 },
      eligibleRows: [],
    });
    const request = new Request('https://ecorex.app/api/fuse/eligible', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { eligible: unknown[] };
    expect(body.eligible).toEqual([]);
    const eligibleQueryCall = db.calls.find((c) => c.sql.includes('GROUP BY species.id'));
    expect(eligibleQueryCall?.args).toEqual([1, 5]);
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

  it('only needs 4 duplicates for a user at level 15+', async () => {
    // xp: 400 = level 5 threshold... use a value at/above the level-15 threshold (2619).
    const { env } = makeEnv({
      oldestRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      xp: { xp: 2619 },
      first: {
        species_id: 7,
        scientific_name: 'Tyrannosaurus imperator',
        common_name: 'Rex de Fuego',
        physical_traits: null,
        base_palette: null,
        silhouette: null,
        fractae_child_name: 'Furia',
        anchor_image_url: '/species-art/rex/exceso.png',
      },
    });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    expect(response.status).toBe(201);
  });

  it('fuses 5 oldest duplicates and returns a new exceso discovery', async () => {
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
        anchor_image_url: '/species-art/rex/exceso.png',
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
    expect(body.phase).toBe('exceso');
    expect(body.commonName).toBe('Rex de Fuego');
    const updateCalls = db.calls.filter((c) => c.sql.includes('SET consumed_at'));
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it('includes an xp block with rarity + fusion bonus xp in the response', async () => {
    const { env } = makeEnv({
      oldestRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      first: {
        species_id: 7,
        scientific_name: 'Tyrannosaurus imperator',
        common_name: 'Rex de Fuego',
        physical_traits: null,
        base_palette: null,
        silhouette: null,
        fractae_child_name: 'Furia',
        anchor_image_url: '/species-art/rex/exceso.png',
      },
      xp: { xp: 0 },
      ownedPhases: [],
    });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    const body = (await response.json()) as { xp: { xpGained: number } };
    expect(body.xp.xpGained).toBe(15); // registrada fusion (evolution) xp
  });

  it('awards the fusion mission xp when this fusion completes it', async () => {
    const { env } = makeEnv({
      oldestRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      first: {
        species_id: 7,
        scientific_name: 'Tyrannosaurus imperator',
        common_name: 'Rex de Fuego',
        physical_traits: null,
        base_palette: null,
        silhouette: null,
        fractae_child_name: 'Furia',
        anchor_image_url: '/species-art/rex/exceso.png',
      },
      xp: { xp: 0 },
      ownedPhases: [],
      missionProgress: { fusion: { progress_count: 1, completed_at: null } },
    });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    const body = (await response.json()) as { xp: { xpGained: number }; missionsCompleted: string[] };
    expect(body.xp.xpGained).toBe(15 + 20); // fusion (evolution) xp + fusion mission xp
    expect(body.missionsCompleted).toContain('fusion');
  });

  it('adds the species-complete bonus when this fusion finishes the set', async () => {
    // Before this fusion the user only owns balance; fusing now produces the
    // exceso discovery — but eco is already owned, so this fusion is what
    // completes the balance+exceso+eco set for the first time.
    const { env } = makeEnv({
      oldestRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      first: {
        species_id: 7,
        scientific_name: 'Tyrannosaurus imperator',
        common_name: 'Rex de Fuego',
        physical_traits: null,
        base_palette: null,
        silhouette: null,
        fractae_child_name: 'Furia',
        anchor_image_url: '/species-art/rex/exceso.png',
      },
      xp: { xp: 0 },
      ownedPhasesBefore: ['balance', 'eco'],
      ownedPhasesAfter: ['balance', 'exceso', 'eco'],
    });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    const body = (await response.json()) as { xp: { xpGained: number } };
    expect(body.xp.xpGained).toBe(15 + 200); // fusion xp + species-complete bonus
  });

  it('does NOT re-award the species-complete bonus when the species was already complete before this fusion', async () => {
    // The user already owns balance+exceso+eco for this species before fusing
    // again (e.g. a later batch of 5 duplicates). The set was already
    // complete before this action, so no bonus should be granted again.
    const { env } = makeEnv({
      oldestRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      first: {
        species_id: 7,
        scientific_name: 'Tyrannosaurus imperator',
        common_name: 'Rex de Fuego',
        physical_traits: null,
        base_palette: null,
        silhouette: null,
        fractae_child_name: 'Furia',
        anchor_image_url: '/species-art/rex/exceso.png',
      },
      xp: { xp: 0 },
      ownedPhasesBefore: ['balance', 'exceso', 'eco'],
      ownedPhasesAfter: ['balance', 'exceso', 'eco'],
    });
    const request = new Request('https://ecorex.app/api/fuse', {
      method: 'POST',
      headers: { Cookie: 'ecorex_session=abc' },
      body: JSON.stringify({ speciesId: 7 }),
    });
    const response = await onRequestPost({ request, env } as never);
    const body = (await response.json()) as { xp: { xpGained: number } };
    expect(body.xp.xpGained).toBe(15); // fusion xp only, no species-complete bonus
  });
});
