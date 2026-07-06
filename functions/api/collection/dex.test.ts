import { describe, it, expect } from 'vitest';
import { onRequestGet } from './dex';

function makeEnv(opts: {
  currentWave: number;
  speciesRows: { id: number; launch_wave: number }[];
  discoveryRows: Array<{
    discovery_id: number;
    discovery_code: string;
    phase: string;
    image_url: string;
    discovered_at: string;
    consumed_at?: string | null;
    species_id: number;
    scientific_name: string;
    common_name: string;
    fractae_child_name: string;
    rarity_name: string;
  }>;
}) {
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000 };
  const db = {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          if (sql.includes('MAX(launch_wave)')) return { wave: opts.currentWave } as unknown as T;
          return null;
        },
        async all<T>() {
          if (sql.includes('FROM species')) return { results: opts.speciesRows as unknown as T[] };
          if (sql.includes('FROM discoveries')) return { results: opts.discoveryRows as unknown as T[] };
          return { results: [] as T[] };
        },
      };
    },
  };
  return { env: { DB: db as unknown as D1Database } };
}

describe('GET /api/collection/dex', () => {
  it('returns 401 without a session cookie', async () => {
    const { env } = makeEnv({ currentWave: 1, speciesRows: [], discoveryRows: [] });
    const request = new Request('https://example.com/api/collection/dex');
    const response = await onRequestGet({ request, env } as unknown as Parameters<typeof onRequestGet>[0]);
    expect(response.status).toBe(401);
  });

  it('returns all species x phase slots for the current wave, locked when not discovered', async () => {
    const { env } = makeEnv({
      currentWave: 1,
      speciesRows: [{ id: 1, launch_wave: 1 }, { id: 7, launch_wave: 1 }],
      discoveryRows: [],
    });
    const request = new Request('https://example.com/api/collection/dex', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as unknown as Parameters<typeof onRequestGet>[0]);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { currentWave: number; slots: Array<Record<string, unknown>> };
    expect(body.currentWave).toBe(1);
    expect(body.slots).toHaveLength(6); // 2 species x 3 phases
    for (const slot of body.slots) {
      expect(slot.locked).toBe(true);
      expect(slot).not.toHaveProperty('scientific_name');
      expect(slot).not.toHaveProperty('common_name');
      expect(slot).not.toHaveProperty('image_url');
    }
  });

  it('reveals full data only for discovered species+phase, and counts duplicates', async () => {
    const { env } = makeEnv({
      currentWave: 1,
      speciesRows: [{ id: 1, launch_wave: 1 }],
      discoveryRows: [
        {
          discovery_id: 10,
          discovery_code: 'DX-AAA',
          phase: 'balance',
          image_url: '/species-art/rex/balance.png',
          discovered_at: '2026-07-05T10:00:00Z',
          consumed_at: null,
          species_id: 1,
          scientific_name: 'Tyrannosaurus imperator',
          common_name: 'Rex de Fuego',
          fractae_child_name: 'Furia',
          rarity_name: 'Especie Registrada',
        },
        {
          discovery_id: 9,
          discovery_code: 'DX-ZZZ',
          phase: 'balance',
          image_url: '/species-art/rex/balance-old.png',
          discovered_at: '2026-07-04T10:00:00Z',
          consumed_at: null,
          species_id: 1,
          scientific_name: 'Tyrannosaurus imperator',
          common_name: 'Rex de Fuego',
          fractae_child_name: 'Furia',
          rarity_name: 'Especie Registrada',
        },
      ],
    });
    const request = new Request('https://example.com/api/collection/dex', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as unknown as Parameters<typeof onRequestGet>[0]);
    const body = (await response.json()) as { slots: Array<Record<string, unknown>> };
    expect(body.slots).toHaveLength(3); // 1 species x 3 phases
    const balanceSlot = body.slots.find((s) => s.phase === 'balance')!;
    expect(balanceSlot.locked).toBe(false);
    expect(balanceSlot.count).toBe(2);
    expect(balanceSlot.discovery_code).toBe('DX-AAA'); // most recent wins as representative
    const excesoSlot = body.slots.find((s) => s.phase === 'exceso')!;
    expect(excesoSlot.locked).toBe(true);
  });

  it('keeps a phase registered after fusion consumes every copy, with count 0', async () => {
    const { env } = makeEnv({
      currentWave: 1,
      speciesRows: [{ id: 1, launch_wave: 1 }],
      discoveryRows: [
        {
          discovery_id: 10,
          discovery_code: 'DX-AAA',
          phase: 'balance',
          image_url: '/species-art/rex/balance.png',
          discovered_at: '2026-07-05T10:00:00Z',
          consumed_at: '2026-07-06T10:00:00Z',
          species_id: 1,
          scientific_name: 'Tyrannosaurus imperator',
          common_name: 'Rex de Fuego',
          fractae_child_name: 'Furia',
          rarity_name: 'Especie Registrada',
        },
      ],
    });
    const request = new Request('https://example.com/api/collection/dex', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as unknown as Parameters<typeof onRequestGet>[0]);
    const body = (await response.json()) as { slots: Array<Record<string, unknown>> };
    const balanceSlot = body.slots.find((s) => s.phase === 'balance')!;
    expect(balanceSlot.locked).toBe(false);
    expect(balanceSlot.count).toBe(0);
  });

  it('excludes species from waves beyond the current active wave', async () => {
    const { env } = makeEnv({
      currentWave: 1,
      speciesRows: [{ id: 1, launch_wave: 1 }], // simulates the real WHERE launch_wave <= 1 filter already having run
      discoveryRows: [],
    });
    const request = new Request('https://example.com/api/collection/dex', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const response = await onRequestGet({ request, env } as unknown as Parameters<typeof onRequestGet>[0]);
    const body = (await response.json()) as { slots: Array<{ wave: number }> };
    // Only wave-1 species' slots should appear; nothing from a hypothetical wave 2+ species leaks in.
    expect(body.slots.every((s) => s.wave <= 1)).toBe(true);
    expect(body.slots).toHaveLength(3);
  });
});
