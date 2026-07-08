import { describe, it, expect } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import { MISSION_DEFS, DAILY_BONUS_XP, todayUTC, incrementMission, checkAndAwardDailyBonus } from './missions';

describe('constants', () => {
  it('defines the three fixed daily missions', () => {
    expect(MISSION_DEFS).toEqual({
      percibir: { target: 2, xp: 15, label: 'Percibe 2 veces hoy' },
      coleccionista: { target: 1, xp: 20, label: 'Consigue 1 carta nueva hoy' },
      fusion: { target: 1, xp: 20, label: 'Completa 1 fusión hoy' },
    });
  });

  it('defines the all-three-completed bonus', () => {
    expect(DAILY_BONUS_XP).toBe(30);
  });
});

describe('todayUTC', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayUTC()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

function makeMissionsDb(rows: Record<string, { progress_count: number; completed_at: string | null }>) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return this;
        },
        async first<T>() {
          if (sql.includes('SELECT progress_count, completed_at FROM daily_missions')) {
            const lastCall = calls[calls.length - 1];
            const slug = lastCall.args[1] as string;
            return (rows[slug] as unknown as T) ?? null;
          }
          return null;
        },
        async all<T>() {
          if (sql.includes('SELECT mission_slug, completed_at FROM daily_missions')) {
            return {
              results: Object.entries(rows)
                .filter(([slug]) => slug !== 'bonus')
                .map(([mission_slug, row]) => ({ mission_slug, completed_at: row.completed_at })) as T[],
            };
          }
          return { results: [] as T[] };
        },
        async run() {
          return { meta: { last_row_id: 1 } };
        },
      };
    },
    calls,
  };
  return db;
}

describe('incrementMission', () => {
  it('reports completedNow true the first time progress reaches the target', async () => {
    const db = makeMissionsDb({ fusion: { progress_count: 1, completed_at: null } });
    const result = await incrementMission(db as unknown as D1Database, 1, 'fusion', '2026-07-08');
    expect(result.completedNow).toBe(true);
    expect(result.progress).toBe(1);
  });

  it('reports completedNow false on subsequent calls after already completed', async () => {
    const db = makeMissionsDb({ fusion: { progress_count: 1, completed_at: '2026-07-08T10:00:00Z' } });
    const result = await incrementMission(db as unknown as D1Database, 1, 'fusion', '2026-07-08');
    expect(result.completedNow).toBe(false);
  });

  it('reports completedNow false while still below target', async () => {
    const db = makeMissionsDb({ percibir: { progress_count: 1, completed_at: null } });
    const result = await incrementMission(db as unknown as D1Database, 1, 'percibir', '2026-07-08');
    expect(result.completedNow).toBe(false);
    expect(result.progress).toBe(1);
  });
});

describe('checkAndAwardDailyBonus', () => {
  it('returns false when not all three missions are completed', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 2, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 0, completed_at: null },
      fusion: { progress_count: 1, completed_at: '2026-07-08T10:00:00Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(false);
  });

  it('returns true the first time all three are completed and the bonus is not yet awarded', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 2, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 1, completed_at: '2026-07-08T10:05:00Z' },
      fusion: { progress_count: 1, completed_at: '2026-07-08T10:10:00Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(true);
  });

  it('returns false when the bonus was already awarded', async () => {
    const db = makeMissionsDb({
      percibir: { progress_count: 2, completed_at: '2026-07-08T10:00:00Z' },
      coleccionista: { progress_count: 1, completed_at: '2026-07-08T10:05:00Z' },
      fusion: { progress_count: 1, completed_at: '2026-07-08T10:10:00Z' },
      bonus: { progress_count: 0, completed_at: '2026-07-08T10:10:01Z' },
    });
    const awarded = await checkAndAwardDailyBonus(db as unknown as D1Database, 1, '2026-07-08');
    expect(awarded).toBe(false);
  });
});
