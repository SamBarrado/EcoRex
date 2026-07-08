import { describe, it, expect } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import { maxEnergyForLevel, getEnergyState, consumeEnergy, BASE_MAX_ENERGY } from './energy';

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

function makeDb(row: { energy_count: number; energy_window_start: number | null; unlimited_energy: number }) {
  return {
    prepare() {
      return {
        bind() {
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

describe('consumeEnergy', () => {
  it('allows consuming up to the level-adjusted max', async () => {
    const db = makeDb({ energy_count: 4, energy_window_start: Date.now(), unlimited_energy: 0 });
    const result = await consumeEnergy(db, 1, 5);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(3);
  });
});
