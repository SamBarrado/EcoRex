import { D1Database } from '@cloudflare/workers-types';

// Level cap: xp keeps accumulating past this for stats purposes, but the
// derived level never exceeds it.
export const MAX_LEVEL = 50;

// XP for the first time a discovery lands in a new species+phase slot
// (isNewSlot === true). Duplicates (isNewSlot === false) get 0 xp — only
// fresh collection progress counts, not repeat pulls.
export const RARITY_XP: Record<string, number> = {
  registrada: 10,
  notable: 20,
  singular: 35,
  epica: 60,
  primordial: 100,
};

// XP for a fusion's resulting `exceso` discovery ("evolución de fase").
// Replaces the old RARITY_XP[tier] + flat FUSION_XP_BONUS model — a flat
// bonus distorted low tiers far more than high ones.
export const FUSION_RARITY_XP: Record<string, number> = {
  registrada: 15,
  notable: 30,
  singular: 50,
  epica: 90,
  primordial: 150,
};

export const SPECIES_COMPLETE_XP_BONUS = 200;

// Not wired up anywhere yet — functions/api/gifts/* doesn't exist. Documented
// here so the gifting feature can award XP without redesigning this module.
export const GIFT_REDEEMED_XP_BONUS = 25;

// Level-derived functional rewards. Never persisted — recomputed from the
// user's level every time, same reasoning as the level itself.
const ENERGY_BONUS_LEVEL_1 = 5;
const ENERGY_BONUS_LEVEL_2 = 30;
const FUSION_THRESHOLD_REDUCTION_LEVEL = 15;

export function energyBonusForLevel(level: number): number {
  let bonus = 0;
  if (level >= ENERGY_BONUS_LEVEL_1) bonus += 1;
  if (level >= ENERGY_BONUS_LEVEL_2) bonus += 1;
  return bonus;
}

export function fusionThresholdReductionForLevel(level: number): number {
  return level >= FUSION_THRESHOLD_REDUCTION_LEVEL ? 1 : 0;
}

const LEVEL_TITLES: Array<{ level: number; title: string }> = [
  { level: 1, title: 'Explorador Novato' },
  { level: 5, title: 'Perceptor Iniciado' },
  { level: 10, title: 'Guía de la Fractura' },
  { level: 15, title: 'Custodio de Fractae' },
  { level: 20, title: 'Intérprete de lo Oculto' },
  { level: 30, title: 'Vidente Épico' },
  { level: 40, title: 'Guardián Primordial' },
  { level: 50, title: 'Voz de la Fractura' },
];

export function titleForLevel(level: number): string {
  let current = LEVEL_TITLES[0].title;
  for (const tier of LEVEL_TITLES) {
    if (level < tier.level) break;
    current = tier.title;
  }
  return current;
}

// Cumulative XP required to reach `level`. Curve: round(50 * (level-1)^1.5).
// The (level-1) shift is required so level 1 sits at exactly 0 xp — a brand
// new player (xp=0) must show a 0-progress bar, not a negative one.
// level 2 = 50, level 5 = 400, level 50 = 17150.
export function xpForLevel(level: number): number {
  return Math.round(50 * Math.pow(level - 1, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
} {
  const level = levelFromXp(xp);
  const xpIntoLevel = xp - xpForLevel(level);
  if (level >= MAX_LEVEL) {
    return { level, xpIntoLevel, xpForNextLevel: null };
  }
  const xpForNextLevel = xpForLevel(level + 1) - xpForLevel(level);
  return { level, xpIntoLevel, xpForNextLevel };
}

export interface AddXpResult {
  xpGained: number;
  totalXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
}

export async function addXp(db: D1Database, userId: number, amount: number): Promise<AddXpResult> {
  const beforeRow = await db.prepare('SELECT xp FROM users WHERE id = ?').bind(userId).first<{ xp: number }>();
  const previousXp = beforeRow?.xp ?? 0;
  const previousLevel = levelFromXp(previousXp);

  await db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').bind(amount, userId).run();

  const afterRow = await db.prepare('SELECT xp FROM users WHERE id = ?').bind(userId).first<{ xp: number }>();
  const totalXp = afterRow?.xp ?? previousXp + amount;
  const progress = xpProgress(totalXp);

  return {
    xpGained: amount,
    totalXp,
    level: progress.level,
    previousLevel,
    leveledUp: progress.level > previousLevel,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
  };
}
