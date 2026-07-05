import { describe, it, expect } from 'vitest';
import { xpForLevel, levelFromXp, xpProgress, MAX_LEVEL, RARITY_XP, FUSION_XP_BONUS, SPECIES_COMPLETE_XP_BONUS } from './xp';

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('returns 100 for level 2', () => {
    expect(xpForLevel(2)).toBe(100);
  });

  it('returns 1000 for level 5', () => {
    expect(xpForLevel(5)).toBe(1000);
  });

  it('returns 122500 for level 50', () => {
    expect(xpForLevel(50)).toBe(122500);
  });
});

describe('levelFromXp', () => {
  it('returns level 1 for 0 xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('returns level 1 for 99 xp (just under level 2 threshold)', () => {
    expect(levelFromXp(99)).toBe(1);
  });

  it('returns level 2 for exactly 100 xp', () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it('clamps to level 50 for xp far beyond the level-50 threshold', () => {
    expect(levelFromXp(999999)).toBe(MAX_LEVEL);
  });
});

describe('xpProgress', () => {
  it('reports progress into the current level', () => {
    // level 2 starts at 100 xp, level 3 starts at 300 xp
    expect(xpProgress(150)).toEqual({ level: 2, xpIntoLevel: 50, xpForNextLevel: 200 });
  });

  it('returns null xpForNextLevel at the level cap', () => {
    const progress = xpProgress(999999);
    expect(progress.level).toBe(MAX_LEVEL);
    expect(progress.xpForNextLevel).toBeNull();
  });
});

describe('constants', () => {
  it('defines xp values for every rarity tier', () => {
    expect(RARITY_XP).toEqual({
      registrada: 10,
      notable: 20,
      singular: 40,
      epica: 80,
      primordial: 150,
    });
  });

  it('defines the fusion and species-complete bonuses', () => {
    expect(FUSION_XP_BONUS).toBe(50);
    expect(SPECIES_COMPLETE_XP_BONUS).toBe(200);
  });
});
