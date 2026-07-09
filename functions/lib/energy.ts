import { energyBonusForLevel } from './xp';

export const BASE_MAX_ENERGY = 3;
// Drip regen: +1 energy every REGEN_INTERVAL_MS instead of a single full
// refill after a flat window. At the base max (3) this reaches full from
// empty in the same 12h the old flat-window model took, so the daily budget
// is unchanged — only the delivery rhythm is.
export const REGEN_INTERVAL_MS = 4 * 60 * 60 * 1000;

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

// energy_window_start doubles as the drip anchor: null means "at max, nothing
// accruing"; otherwise it's the timestamp from which elapsed time is divided
// into REGEN_INTERVAL_MS ticks, each worth +1 energy up to max.
function computeState(row: EnergyRow, now: number, max: number): EnergyState {
  if (row.energy_window_start === null) {
    return { remaining: max, max, resetAt: null };
  }
  const elapsed = now - row.energy_window_start;
  const ticks = Math.floor(elapsed / REGEN_INTERVAL_MS);
  const remaining = Math.min(max, row.energy_count + ticks);
  if (remaining >= max) {
    return { remaining: max, max, resetAt: null };
  }
  return { remaining, max, resetAt: row.energy_window_start + (ticks + 1) * REGEN_INTERVAL_MS };
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
  // Roll any already-earned ticks into the anchor before spending, so partial
  // progress toward the next tick survives instead of being reset to "now"
  // on every spend.
  let newWindowStart: number;
  if (row.energy_window_start === null) {
    newWindowStart = now;
  } else {
    const elapsed = now - row.energy_window_start;
    const ticks = Math.floor(elapsed / REGEN_INTERVAL_MS);
    newWindowStart = row.energy_window_start + ticks * REGEN_INTERVAL_MS;
  }
  await db
    .prepare("UPDATE users SET energy_count = ?, energy_window_start = ? WHERE id = ?")
    .bind(newRemaining, newWindowStart, userId)
    .run();

  const resetAt = newRemaining < max ? newWindowStart + REGEN_INTERVAL_MS : null;
  return { success: true, remaining: newRemaining, resetAt };
}
