const REGEN_INTERVAL_MS = 4 * 60 * 60 * 1000;

export interface EnergyRow {
  id: number;
  energy_count: number;
  energy_window_start: number | null;
  unlimited_energy: number;
  energy_last_notified_count: number;
  max_energy: number;
}

export interface UserToNotify {
  id: number;
  remaining: number;
  max: number;
}

function currentRemaining(row: EnergyRow, now: number): number {
  if (row.energy_window_start === null) return row.max_energy;
  const elapsed = now - row.energy_window_start;
  const ticks = Math.floor(elapsed / REGEN_INTERVAL_MS);
  return Math.min(row.max_energy, row.energy_count + ticks);
}

// Notifies once per energy point gained (not just once at max): a user is
// selected whenever their currently-computed energy is higher than the last
// value they were pushed about, so a single day of drip regen can produce
// several pushes as each point comes in.
export function selectUsersToNotify(rows: EnergyRow[], now: number): UserToNotify[] {
  const result: UserToNotify[] = [];
  for (const row of rows) {
    if (row.unlimited_energy) continue;
    const remaining = currentRemaining(row, now);
    if (remaining > row.energy_last_notified_count) {
      result.push({ id: row.id, remaining, max: row.max_energy });
    }
  }
  return result;
}
