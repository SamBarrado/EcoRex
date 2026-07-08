import { energyBonusForLevel } from './xp';

export const BASE_MAX_ENERGY = 3;
const WINDOW_MS = 12 * 60 * 60 * 1000;

export function maxEnergyForLevel(level: number): number {
  return BASE_MAX_ENERGY + energyBonusForLevel(level);
}

export interface EnergyState {
  remaining: number;
  max: number;
  resetAt: number | null;
  unlimited?: true;
}

interface EnergyRow {
  energy_count: number;
  energy_window_start: number | null;
  unlimited_energy: number;
}

function computeState(row: EnergyRow, now: number, max: number): EnergyState {
  if (row.energy_window_start === null) {
    return { remaining: max, max, resetAt: null };
  }
  const elapsed = now - row.energy_window_start;
  if (elapsed >= WINDOW_MS) {
    return { remaining: max, max, resetAt: null };
  }
  return { remaining: row.energy_count, max, resetAt: row.energy_window_start + WINDOW_MS };
}

export async function getEnergyState(db: D1Database, userId: number, level: number): Promise<EnergyState> {
  const max = maxEnergyForLevel(level);
  const row = await db
    .prepare("SELECT energy_count, energy_window_start, unlimited_energy FROM users WHERE id = ?")
    .bind(userId)
    .first<EnergyRow>();
  if (!row) {
    return { remaining: max, max, resetAt: null };
  }
  if (row.unlimited_energy) {
    return { remaining: max, max, resetAt: null, unlimited: true };
  }
  return computeState(row, Date.now(), max);
}

export async function consumeEnergy(
  db: D1Database,
  userId: number,
  level: number
): Promise<{ success: boolean; remaining: number; resetAt: number | null }> {
  const max = maxEnergyForLevel(level);
  const row = await db
    .prepare("SELECT energy_count, energy_window_start, unlimited_energy FROM users WHERE id = ?")
    .bind(userId)
    .first<EnergyRow>();
  if (!row) {
    return { success: false, remaining: 0, resetAt: null };
  }
  if (row.unlimited_energy) {
    return { success: true, remaining: max, resetAt: null };
  }

  const now = Date.now();
  const state = computeState(row, now, max);
  if (state.remaining <= 0) {
    return { success: false, remaining: 0, resetAt: state.resetAt };
  }

  const newRemaining = state.remaining - 1;
  const newWindowStart = state.resetAt === null ? now : row.energy_window_start;
  await db
    .prepare("UPDATE users SET energy_count = ?, energy_window_start = ? WHERE id = ?")
    .bind(newRemaining, newWindowStart, userId)
    .run();

  return { success: true, remaining: newRemaining, resetAt: newWindowStart! + WINDOW_MS };
}
