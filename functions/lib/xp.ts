// Level cap: xp keeps accumulating past this for stats purposes, but the
// derived level never exceeds it.
export const MAX_LEVEL = 50;

export const RARITY_XP: Record<string, number> = {
  registrada: 10,
  notable: 20,
  singular: 40,
  epica: 80,
  primordial: 150,
};

export const FUSION_XP_BONUS = 50;
export const SPECIES_COMPLETE_XP_BONUS = 200;

// Not wired up anywhere yet — functions/api/gifts/* doesn't exist. Documented
// here so the gifting feature can award XP without redesigning this module.
export const GIFT_REDEEMED_XP_BONUS = 25;

// Cumulative XP required to reach `level`. Triangular curve: level 2 = 100,
// level 5 = 1000, level 50 = 122500.
export function xpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2;
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

import { D1Database } from '@cloudflare/workers-types';

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
