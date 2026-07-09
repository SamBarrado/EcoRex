import { describe, it, expect } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import { maxEnergyForLevel, getEnergyState, consumeEnergy, BASE_MAX_ENERGY, REGEN_INTERVAL_MS } from './energy';

describe('maxEnergyForLevel', () => {
  it('returns the base max below level 5', () => {
    expect(maxEnergyForLevel(1)).toBe(BASE_MAX_ENERGY);
  });

  it('returns base+1 from level 5 up to level 29', () => {
    expect(maxEnergyForLevel(5)).toBe(BASE_MAX_ENERGY + 1);
  });

  it('returns base+2 from level 30 onward', () => {
    expect(maxEnergyForLevel(30)).toBe(BASE_MAX_ENERGY + 2);
  });
});

function makeDb(
  row: { energy_count: number; energy_window_start: number | null; unlimited_energy: number },
  onUpdate?: (args: unknown[]) => void,
) {
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          if (sql.startsWith('UPDATE') && onUpdate) onUpdate(args);
          return this;
        },
        async first() {
          return row;
        },
        async run() {
          return { meta: { last_row_id: 1 } };
        },
      };
    },
  } as unknown as D1Database;
}

describe('getEnergyState', () => {
  it('reports max according to the level passed in', async () => {
    const db = makeDb({ energy_count: 3, energy_window_start: null, unlimited_energy: 0 });
    const state = await getEnergyState(db, 1, 30);
    expect(state.max).toBe(BASE_MAX_ENERGY + 2);
    expect(state.remaining).toBe(BASE_MAX_ENERGY + 2);
  });
});

describe('getEnergyState (drip regen)', () => {
  it('grants +1 energy per elapsed REGEN_INTERVAL_MS tick, capped at max', async () => {
    const anchor = Date.now() - 2 * REGEN_INTERVAL_MS - 1000; // just past 2 ticks
    const db = makeDb({ energy_count: 0, energy_window_start: anchor, unlimited_energy: 0 });
    const state = await getEnergyState(db, 1, 1); // level 1 -> max = BASE_MAX_ENERGY (3)
    expect(state.remaining).toBe(2);
    expect(state.resetAt).toBe(anchor + 3 * REGEN_INTERVAL_MS);
  });

  it('caps accrual at max and clears resetAt once full', async () => {
    const anchor = Date.now() - 10 * REGEN_INTERVAL_MS; // way more ticks than needed
    const db = makeDb({ energy_count: 0, energy_window_start: anchor, unlimited_energy: 0 });
    const state = await getEnergyState(db, 1, 1);
    expect(state.remaining).toBe(BASE_MAX_ENERGY);
    expect(state.resetAt).toBeNull();
  });
});

describe('consumeEnergy', () => {
  it('allows consuming up to the level-adjusted max', async () => {
    const db = makeDb({ energy_count: 4, energy_window_start: Date.now(), unlimited_energy: 0 });
    const result = await consumeEnergy(db, 1, 5);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it('fails once energy is fully depleted, reporting the next tick time', async () => {
    const anchor = Date.now() - 1000; // barely into the current tick
    const db = makeDb({ energy_count: 0, energy_window_start: anchor, unlimited_energy: 0 });
    const result = await consumeEnergy(db, 1, 1);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBe(anchor + REGEN_INTERVAL_MS);
  });

  it('preserves partial progress toward the next tick instead of resetting the anchor to now', async () => {
    // 1.5 ticks elapsed: 1 tick already earned, half a tick of progress pending
    const anchor = Date.now() - REGEN_INTERVAL_MS * 1.5;
    let updateArgs: unknown[] = [];
    const db = makeDb({ energy_count: 0, energy_window_start: anchor, unlimited_energy: 0 }, (args) => {
      updateArgs = args;
    });
    const result = await consumeEnergy(db, 1, 1); // remaining was 1 (from the earned tick), now 0
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
    // Persisted anchor should be advanced by exactly the earned tick (not reset to "now"),
    // so the pending half-tick of progress survives for the next read.
    const [, persistedWindowStart] = updateArgs;
    expect(persistedWindowStart).toBe(anchor + REGEN_INTERVAL_MS);
  });

  it('resets energy_last_notified_count to the post-spend remaining when spending energy', async () => {
    const calls: { sql: string; args: unknown[] }[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            calls.push({ sql, args });
            return this;
          },
          async first<T>() {
            return { energy_count: 3, energy_window_start: null, unlimited_energy: 0 } as unknown as T;
          },
          async run() {
            return {};
          },
        };
      },
    } as unknown as D1Database;

    await consumeEnergy(db, 1, 1);

    const update = calls.find((c) => c.sql.includes('UPDATE users SET energy_count'));
    expect(update?.sql).toContain('energy_last_notified_count = ?');
    // energy_count=3 - 1 spent = 2 remaining; both the persisted energy_count
    // and energy_last_notified_count should be reset to that same value.
    expect(update?.args).toEqual([2, expect.any(Number), 2, 1]);
  });
});
