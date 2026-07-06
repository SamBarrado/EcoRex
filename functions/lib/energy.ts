export const MAX_ENERGY = 2;
const WINDOW_MS = 12 * 60 * 60 * 1000;

export interface EnergyState {
  remaining: number;
  resetAt: number | null;
  unlimited?: true;
}

interface EnergyRow {
  energy_count: number;
  energy_window_start: number | null;
  unlimited_energy: number;
}

const UNLIMITED_STATE: EnergyState = { remaining: MAX_ENERGY, resetAt: null, unlimited: true };

function computeState(row: EnergyRow, now: number): EnergyState {
  if (row.energy_window_start === null) {
    return { remaining: MAX_ENERGY, resetAt: null };
  }
  const elapsed = now - row.energy_window_start;
  if (elapsed >= WINDOW_MS) {
    return { remaining: MAX_ENERGY, resetAt: null };
  }
  return { remaining: row.energy_count, resetAt: row.energy_window_start + WINDOW_MS };
}

export async function getEnergyState(db: D1Database, userId: number): Promise<EnergyState> {
  const row = await db
    .prepare("SELECT energy_count, energy_window_start, unlimited_energy FROM users WHERE id = ?")
    .bind(userId)
    .first<EnergyRow>();
  if (!row) {
    return { remaining: MAX_ENERGY, resetAt: null };
  }
  if (row.unlimited_energy) {
    return UNLIMITED_STATE;
  }
  return computeState(row, Date.now());
}

export async function consumeEnergy(
  db: D1Database,
  userId: number
): Promise<{ success: boolean; remaining: number; resetAt: number | null }> {
  const row = await db
    .prepare("SELECT energy_count, energy_window_start, unlimited_energy FROM users WHERE id = ?")
    .bind(userId)
    .first<EnergyRow>();
  if (!row) {
    return { success: false, remaining: 0, resetAt: null };
  }
  if (row.unlimited_energy) {
    return { success: true, ...UNLIMITED_STATE };
  }

  const now = Date.now();
  const state = computeState(row, now);
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
