import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickRarityTier, hasCompletedAllPhases, type RarityTierRow } from './discovery';

const tiers: RarityTierRow[] = [
  { id: 1, slug: 'registrada', name: 'Registrada', anchor_probability: 0.9, drop_weight: 70 },
  { id: 2, slug: 'epica', name: 'Épica', anchor_probability: 0.15, drop_weight: 5 },
];

describe('pickRarityTier', () => {
  afterEach(() => vi.restoreAllMocks());

  it('picks the first tier when the roll lands in its weight band', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // roll = 0.01 * 75 = 0.75, well within tier 1's 70
    expect(pickRarityTier(tiers)).toEqual(tiers[0]);
  });

  it('picks the second tier when the roll exceeds the first tier weight', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // roll = 0.999 * 75 = 74.925, past tier 1's 70
    expect(pickRarityTier(tiers)).toEqual(tiers[1]);
  });
});

function makeDb(distinctPhases: string[]) {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async all<T>() {
          if (sql.includes('DISTINCT phase')) {
            return { results: distinctPhases.map((phase) => ({ phase })) as T[] };
          }
          return { results: [] as T[] };
        },
      };
    },
  } as unknown as D1Database;
}

describe('hasCompletedAllPhases', () => {
  it('returns false when only some phases are owned', async () => {
    const db = makeDb(['balance', 'exceso']);
    const result = await hasCompletedAllPhases(db, 1, 7, ['balance', 'exceso', 'eco']);
    expect(result).toBe(false);
  });

  it('returns true when all required phases are owned', async () => {
    const db = makeDb(['balance', 'exceso', 'eco']);
    const result = await hasCompletedAllPhases(db, 1, 7, ['balance', 'exceso', 'eco']);
    expect(result).toBe(true);
  });
});
