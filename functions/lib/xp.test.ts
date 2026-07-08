import { describe, it, expect } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import { xpForLevel, levelFromXp, xpProgress, MAX_LEVEL, RARITY_XP, FUSION_RARITY_XP, SPECIES_COMPLETE_XP_BONUS, addXp, energyBonusForLevel, fusionThresholdReductionForLevel } from './xp';

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('returns 50 for level 2', () => {
    expect(xpForLevel(2)).toBe(50);
  });

  it('returns 400 for level 5', () => {
    expect(xpForLevel(5)).toBe(400);
  });

  it('returns 17150 for level 50', () => {
    expect(xpForLevel(50)).toBe(17150);
  });
});

describe('levelFromXp', () => {
  it('returns level 1 for 0 xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('returns level 1 for 49 xp (just under level 2 threshold)', () => {
    expect(levelFromXp(49)).toBe(1);
  });

  it('returns level 2 for exactly 50 xp', () => {
    expect(levelFromXp(50)).toBe(2);
  });

  it('clamps to level 50 for xp far beyond the level-50 threshold', () => {
    expect(levelFromXp(999999)).toBe(MAX_LEVEL);
  });
});

describe('xpProgress', () => {
  it('reports progress into the current level', () => {
    // level 2 starts at 50 xp, level 3 starts at 141 xp
    expect(xpProgress(150)).toEqual({ level: 3, xpIntoLevel: 9, xpForNextLevel: 119 });
  });

  it('returns null xpForNextLevel at the level cap', () => {
    const progress = xpProgress(999999);
    expect(progress.level).toBe(MAX_LEVEL);
    expect(progress.xpForNextLevel).toBeNull();
  });
});

describe('constants', () => {
  it('defines new-entry xp values for every rarity tier', () => {
    expect(RARITY_XP).toEqual({
      registrada: 10,
      notable: 20,
      singular: 35,
      epica: 60,
      primordial: 100,
    });
  });

  it('defines fusion (evolution) xp values for every rarity tier', () => {
    expect(FUSION_RARITY_XP).toEqual({
      registrada: 15,
      notable: 30,
      singular: 50,
      epica: 90,
      primordial: 150,
    });
  });

  it('defines the species-complete bonus', () => {
    expect(SPECIES_COMPLETE_XP_BONUS).toBe(200);
  });
});

function makeDb(currentXp: number) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return this;
        },
        async first<T>() {
          if (sql.includes('SELECT xp FROM users')) {
            const updateCall = calls.filter((c) => c.sql.includes('UPDATE')).pop();
            return { xp: currentXp + (updateCall ? Number(updateCall.args[0]) : 0) } as unknown as T;
          }
          return null;
        },
        async run() {
          return { meta: { last_row_id: 1 } };
        },
      };
    },
    calls,
  };
  return db;
}

describe('addXp', () => {
  it('adds xp and reports no level-up when staying within the same level', async () => {
    const db = makeDb(10);
    const result = await addXp(db as unknown as D1Database, 1, 5);
    expect(result.xpGained).toBe(5);
    expect(result.totalXp).toBe(15);
    expect(result.previousLevel).toBe(1);
    expect(result.level).toBe(1);
    expect(result.leveledUp).toBe(false);
  });

  it('reports leveledUp true when crossing a level threshold', async () => {
    const db = makeDb(40);
    const result = await addXp(db as unknown as D1Database, 1, 20);
    expect(result.totalXp).toBe(60);
    expect(result.previousLevel).toBe(1);
    expect(result.level).toBe(2);
    expect(result.leveledUp).toBe(true);
  });
});

describe('energyBonusForLevel', () => {
  it('returns 0 below level 5', () => {
    expect(energyBonusForLevel(1)).toBe(0);
    expect(energyBonusForLevel(4)).toBe(0);
  });

  it('returns 1 from level 5 up to (but not including) level 30', () => {
    expect(energyBonusForLevel(5)).toBe(1);
    expect(energyBonusForLevel(29)).toBe(1);
  });

  it('returns 2 from level 30 onward', () => {
    expect(energyBonusForLevel(30)).toBe(2);
    expect(energyBonusForLevel(50)).toBe(2);
  });
});

describe('fusionThresholdReductionForLevel', () => {
  it('returns 0 below level 15', () => {
    expect(fusionThresholdReductionForLevel(1)).toBe(0);
    expect(fusionThresholdReductionForLevel(14)).toBe(0);
  });

  it('returns 1 from level 15 onward', () => {
    expect(fusionThresholdReductionForLevel(15)).toBe(1);
    expect(fusionThresholdReductionForLevel(50)).toBe(1);
  });
});
