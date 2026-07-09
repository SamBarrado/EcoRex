const REGEN_INTERVAL_MS = 4 * 60 * 60 * 1000;

export interface EnergyRow {
  id: number;
  energy_count: number;
  energy_window_start: number | null;
  unlimited_energy: number;
  energy_full_notified_at: number | null;
  max_energy: number;
}

function isAtMax(row: EnergyRow, now: number): boolean {
  if (row.unlimited_energy) return false;
  if (row.energy_window_start === null) return true;
  const elapsed = now - row.energy_window_start;
  const ticks = Math.floor(elapsed / REGEN_INTERVAL_MS);
  return Math.min(row.max_energy, row.energy_count + ticks) >= row.max_energy;
}

export function selectUsersToNotify(rows: EnergyRow[], now: number): number[] {
  return rows.filter((row) => row.energy_full_notified_at === null && isAtMax(row, now)).map((row) => row.id);
}
