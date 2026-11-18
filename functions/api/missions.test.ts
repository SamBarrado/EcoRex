import { describe, it, expect } from 'vitest';
import { onRequestGet } from './missions';

function makeDb(rows: Array<{ mission_slug: string; progress_count: number; completed_at: string | null }>) {
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
});
