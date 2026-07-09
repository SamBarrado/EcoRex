import { describe, it, expect } from 'vitest';
import { selectUsersToNotify } from './selectUsersToNotify';

const HOUR = 60 * 60 * 1000;

describe('selectUsersToNotify', () => {
  it('selects a user whose energy is above the last notified count', () => {
    const rows = [
      { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 0, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, Date.now())).toEqual([{ id: 1, remaining: 3, max: 3 }]);
  });

  it('skips a user already notified about their current energy count', () => {
    const rows = [
      { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_last_notified_count: 3, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, Date.now())).toEqual([]);
  });

  it('skips a user with unlimited energy', () => {
    const rows = [
      { id: 1, energy_count: 0, energy_window_start: null, unlimited_energy: 1, energy_last_notified_count: 0, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, Date.now())).toEqual([]);
  });

  it('skips a user whose energy has not risen above the last notified count yet', () => {
    const now = Date.now();
    const rows = [
      // still 1 energy, already notified about 1 — no new point gained
      { id: 1, energy_count: 1, energy_window_start: now - HOUR, unlimited_energy: 0, energy_last_notified_count: 1, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, now)).toEqual([]);
  });

  it('selects a user whose drip regen reached max between window_start and now', () => {
    const now = Date.now();
    const rows = [
      // 1 stored + 2 ticks of 4h each = 3 = max
      { id: 1, energy_count: 1, energy_window_start: now - 2 * 4 * HOUR, unlimited_energy: 0, energy_last_notified_count: 0, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, now)).toEqual([{ id: 1, remaining: 3, max: 3 }]);
  });

  it('notifies again for a single new point even if a previous point was already notified', () => {
    const now = Date.now();
    const rows = [
      // gained one more tick since being notified about count=1
      { id: 1, energy_count: 1, energy_window_start: now - 4 * HOUR, unlimited_energy: 0, energy_last_notified_count: 1, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, now)).toEqual([{ id: 1, remaining: 2, max: 3 }]);
  });
});
