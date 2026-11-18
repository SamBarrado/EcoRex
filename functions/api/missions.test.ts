import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from './missions';

function makeDb(
  rows: Array<{ mission_slug: string; progress_count: number; completed_at: string | null }>,
  streakDays: string[] = []
) {
  const sessionRow = { id: 1, email: 'a@a.com', display_name: 'A', expires_at: Date.now() + 100000 };
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) return sessionRow as unknown as T;
          return null;
        },
        async all<T>() {
          if (sql.includes('SELECT DISTINCT day FROM daily_missions')) {
            return { results: streakDays.map((day) => ({ day })) as T[] };
          }
          if (sql.includes('FROM daily_missions')) return { results: rows as T[] };
          return { results: [] as T[] };
        },
      };
    },
  } as unknown as D1Database;
}

describe('GET /api/missions', () => {
  it('returns 401 without a session cookie', async () => {
    const request = new Request('https://ecorex.app/api/missions');
    const env = { DB: makeDb([]) };
    const response = await onRequestGet({ request, env } as never);
    expect(response.status).toBe(401);
  });

  it('returns all missions at 0 progress on a fresh day with no rows', async () => {
    const request = new Request('https://ecorex.app/api/missions', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const env = { DB: makeDb([]) };
    const response = await onRequestGet({ request, env } as never);
    const body = (await response.json()) as {
      missions: Array<{ slug: string; progress: number; target: number; completed: boolean }>;
      bonus: { completed: boolean; xp: number };
    };
    expect(body.missions).toEqual([
      { slug: 'percibir', label: 'Percibe hoy', progress: 0, target: 1, completed: false, optional: false },
      { slug: 'coleccionista', label: 'Consigue 3 cartas hoy', progress: 0, target: 3, completed: false, optional: false },
      { slug: 'fusion', label: 'Completa 1 fusión (extra)', progress: 0, target: 1, completed: false, optional: true },
    ]);
    expect(body.bonus).toEqual({ completed: false, xp: 30 });
  });

  it('reflects partial progress from existing rows', async () => {
    const request = new Request('https://ecorex.app/api/missions', {
      headers: { Cookie: 'ecorex_session=abc' },
    });
    const env = {
      DB: makeDb([
        { mission_slug: 'coleccionista', progress_count: 1, completed_at: null },
        { mission_slug: 'fusion', progress_count: 1, completed_at: '2026-07-08T10:00:00Z' },
      ]),
    };
    const response = await onRequestGet({ request, env } as never);
    const body = (await response.json()) as {
      missions: Array<{ slug: string; progress: number; completed: boolean }>;
    };
    const coleccionista = body.missions.find((m) => m.slug === 'coleccionista')!;
    const fusion = body.missions.find((m) => m.slug === 'fusion')!;
    expect(coleccionista).toMatchObject({ progress: 1, completed: false });
    expect(fusion).toMatchObject({ progress: 1, completed: true });
  });

  it('reports the streak: 0 with no activity', async () => {
    const request = new Request('https://ecorex.app/api/missions', { headers: { Cookie: 'ecorex_session=abc' } });
    const response = await onRequestGet({ request, env: { DB: makeDb([]) } } as never);
    const body = (await response.json()) as { streak: unknown };
    expect(body.streak).toEqual({ days: 0, activeToday: false, nextMilestone: 3, nextMilestoneXp: 20 });
  });

  it('reports a live streak that has not been extended today yet', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T10:00:00Z'));
    try {
      const request = new Request('https://ecorex.app/api/missions', { headers: { Cookie: 'ecorex_session=abc' } });
      const env = { DB: makeDb([], ['2026-11-17', '2026-11-16', '2026-11-15']) };
      const response = await onRequestGet({ request, env } as never);
      const body = (await response.json()) as { streak: unknown };
      expect(body.streak).toEqual({ days: 3, activeToday: false, nextMilestone: 7, nextMilestoneXp: 50 });
    } finally {
      vi.useRealTimers();
    }
  });
});
