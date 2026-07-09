import { describe, it, expect } from 'vitest';
import { selectUsersToNotify } from './selectUsersToNotify';

const HOUR = 60 * 60 * 1000;

describe('selectUsersToNotify', () => {
  it('selects a user whose energy is full and who has not been notified yet', () => {
    const rows = [
      { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_full_notified_at: null, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, Date.now())).toEqual([1]);
  });

  it('skips a user already notified since energy went full', () => {
    const rows = [
      { id: 1, energy_count: 3, energy_window_start: null, unlimited_energy: 0, energy_full_notified_at: Date.now(), max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, Date.now())).toEqual([]);
  });

  it('skips a user with unlimited energy', () => {
    const rows = [
      { id: 1, energy_count: 0, energy_window_start: null, unlimited_energy: 1, energy_full_notified_at: null, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, Date.now())).toEqual([]);
  });

  it('skips a user still accumulating energy (not yet at max)', () => {
    const now = Date.now();
    const rows = [
      { id: 1, energy_count: 1, energy_window_start: now - HOUR, unlimited_energy: 0, energy_full_notified_at: null, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, now)).toEqual([]);
  });

  it('selects a user whose drip regen reached max between window_start and now', () => {
    const now = Date.now();
    const rows = [
      // 1 stored + 2 ticks of 4h each = 3 = max
      { id: 1, energy_count: 1, energy_window_start: now - 2 * 4 * HOUR, unlimited_energy: 0, energy_full_notified_at: null, max_energy: 3 },
    ];
    expect(selectUsersToNotify(rows, now)).toEqual([1]);
  });
});
