import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestPost as discover } from './discover';
import { onRequestPost as fuse } from './fuse/index';

// Golden-master test for the economy core (POST /api/discover and POST
// /api/fuse): records the exact sequence of SQL statements (in execution
// order, with their bound parameters) plus the HTTP response for a matrix of
// scenarios. It exists to make refactors of the shared discovery flow safe:
// any change in XP, missions, rarity, notifications or statement order shows
// up as a snapshot diff that has to be reviewed by hand. If a change is
// intentional, update with `npx vitest run functions/api/economy.golden.test.ts -u`
// and review the snapshot diff before committing.

type MissionRow = { progress_count: number; completed_at: string | null };

interface Fixture {
  xp?: number;
  energy?: { energy_count: number; energy_window_start: number | null; unlimited_energy: number } | null;
  activeSpeciesIds?: number[];
  speciesRow?: Record<string, unknown> | null;
  tiers?: Record<string, unknown>[];
  existingSlotCount?: number;
  balanceCountAfterInsert?: number;
  ownedBefore?: string[];
  ownedAfter?: string[];
  missions?: Record<string, MissionRow>;
  oldestRows?: { id: number }[];
  random?: number;
  /** Earlier days (YYYY-MM-DD) with activity, for the daily streak. Today is implied by the mission rows. */
  priorDays?: string[];
  streakRewardClaimed?: boolean;
  /** The first Math.random() of /api/discover is the Eco roll (< 0.05 hits). Default: a miss. */
  ecoRoll?: number;
  /** Species the Eco-eligibility query returns (player already has their Balance). */
  ecoEligible?: number[];
}

const NOW = new Date('2026-11-17T12:00:00Z');

const SPECIES_BALANCE = {
  species_id: 7,
  scientific_name: 'Tyrannosaurus imperator',
  common_name: 'Rex de Fuego',
  fractae_child_name: 'Furia',
  anchor_image_url: '/species-art/rex/balance.webp',
  lore_phrase: 'Donde pisa, la tierra arde.',
};
const SPECIES_EXCESO = { ...SPECIES_BALANCE, anchor_image_url: '/species-art/rex/exceso.webp' };

const TIERS = [
  { id: 1, slug: 'registrada', name: 'Registrada', drop_weight: 55 },
  { id: 2, slug: 'epica', name: 'Épica', drop_weight: 45 },
];

const norm = (sql: string) => sql.replace(/\s+/g, ' ').trim();

function makeEnv(fx: Fixture, kind: 'discover' | 'fuse') {
  const log: unknown[] = [];
  let insertDone = false;
  let currentXp = fx.xp ?? 0;
  const missions: Record<string, MissionRow> = JSON.parse(JSON.stringify(fx.missions ?? {}));
  const species = fx.speciesRow === undefined ? (kind === 'fuse' ? SPECIES_EXCESO : SPECIES_BALANCE) : fx.speciesRow;
  const tiers = fx.tiers ?? TIERS;
  const energy = fx.energy === undefined ? { energy_count: 3, energy_window_start: null, unlimited_energy: 0 } : fx.energy;

  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const rec = (op: string) => log.push({ op, sql: norm(sql), args });
      return {
        bind(...a: unknown[]) {
          args = a;
          return this;
        },
        async first<T>() {
          rec('first');
          if (sql.includes('FROM sessions')) {
            return { id: 1, email: 'a@a.com', display_name: 'A', xp: fx.xp ?? 0, avatar: null, expires_at: NOW.getTime() + 100000 } as unknown as T;
          }
          if (sql.includes('energy_count')) return energy as unknown as T;
          if (sql.includes('JOIN fractae')) return species as unknown as T;
          if (sql.includes('SELECT discovered_at')) return { discovered_at: '2026-11-17 12:00:00' } as unknown as T;
          if (sql.includes('COUNT(*) as balance_count')) return { balance_count: fx.balanceCountAfterInsert ?? 1 } as unknown as T;
          if (sql.includes('COUNT(*) as count FROM discoveries')) return { count: fx.existingSlotCount ?? 0 } as unknown as T;
          if (sql.includes("type = 'streak_reward'")) return (fx.streakRewardClaimed ? { id: 1 } : null) as unknown as T;
          if (sql.includes('SELECT xp FROM users')) return { xp: currentXp } as unknown as T;
          if (sql.includes('SELECT progress_count, completed_at FROM daily_missions')) {
            return (missions[args[1] as string] ?? null) as unknown as T;
          }
          return null;
        },
        async all<T>() {
          rec('all');
          if (sql.includes('FROM rarity_tiers')) return { results: tiers as T[] };
          if (sql.includes("a.phase = 'eco'")) return { results: (fx.ecoEligible ?? []).map((id) => ({ id })) as T[] };
          if (sql.includes('FROM species WHERE is_active')) return { results: (fx.activeSpeciesIds ?? [7]).map((id) => ({ id })) as T[] };
          if (sql.includes('ORDER BY discovered_at ASC')) return { results: (fx.oldestRows ?? []) as T[] };
          if (sql.includes('DISTINCT phase')) {
            const phases = insertDone ? (fx.ownedAfter ?? fx.ownedBefore ?? []) : (fx.ownedBefore ?? []);
            return { results: phases.map((phase) => ({ phase })) as T[] };
          }
          if (sql.includes('SELECT DISTINCT day FROM daily_missions')) {
            return { results: ['2026-11-17', ...(fx.priorDays ?? [])].map((day) => ({ day })) as T[] };
          }
          if (sql.includes('SELECT mission_slug, completed_at FROM daily_missions')) {
            return {
              results: Object.entries(missions)
                .filter(([slug]) => slug !== 'bonus')
                .map(([mission_slug, row]) => ({ mission_slug, completed_at: row.completed_at })) as T[],
            };
          }
          return { results: [] as T[] };
        },
        async run() {
          rec('run');
          if (sql.includes('INSERT INTO discoveries')) insertDone = true;
          if (sql.includes('UPDATE users SET xp')) currentXp += Number(args[0]);
          if (sql.includes('INSERT INTO daily_missions') && sql.includes("'bonus'")) {
            missions.bonus = { progress_count: 0, completed_at: '2026-11-17 12:00:00' };
          } else if (sql.includes('INSERT INTO daily_missions')) {
            const slug = args[1] as string;
            missions[slug] = { progress_count: (missions[slug]?.progress_count ?? 0) + 1, completed_at: missions[slug]?.completed_at ?? null };
          }
          if (sql.includes('UPDATE daily_missions SET completed_at')) {
            missions[args[1] as string].completed_at = '2026-11-17 12:00:00';
          }
          return { meta: { last_row_id: 99 } };
        },
      };
    },
  };
  const env = {
    DB: db as unknown as D1Database,
    RATE_LIMIT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
  };
  return { env, log };
}

async function run(kind: 'discover' | 'fuse', fx: Fixture, body: unknown) {
  const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(fx.random ?? 0);
  // discover.ts rolls the Eco drop before anything else: keep the default a miss.
  if (kind === 'discover') randomSpy.mockReturnValueOnce(fx.ecoRoll ?? 0.99);
  const { env, log } = makeEnv(fx, kind);
  const request = new Request(`https://ecorex.app/api/${kind === 'fuse' ? 'fuse' : 'discover'}`, {
    method: 'POST',
    headers: { Cookie: 'ecorex_session=abc' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const response = await (kind === 'fuse' ? fuse : discover)({ request, env } as never);
  return { status: response.status, body: await response.json(), statements: log };
}

const five = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(((arr: ArrayBufferView) => {
    const view = arr as unknown as Uint8Array;
    for (let i = 0; i < view.length; i++) view[i] = (i * 7 + 3) % 256;
    return arr;
  }) as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('economy golden master: POST /api/discover', () => {
  const cases: [string, Fixture, unknown][] = [
    ['new slot, common rarity (first percibir of the day completes)', {}, { phase: 'balance' }],
    ['new slot, epic rarity', { random: 0.99 }, { phase: 'balance' }],
    ['duplicate (slot already registered)', { existingSlotCount: 3 }, { phase: 'balance' }],
    ['client asking for eco -> 400 (Eco is rolled by the server)', {}, { phase: 'eco' }],
    ['eco drop: roll hits and the species Balance is already registered', { ecoRoll: 0.01, ecoEligible: [7] }, { phase: 'balance' }],
    ['eco roll hits but nothing is eligible -> normal Balance pull', { ecoRoll: 0.01, ecoEligible: [] }, { phase: 'balance' }],
    ['eco drop completes the species (+200 xp)', { ecoRoll: 0.01, ecoEligible: [7], ownedBefore: ['balance', 'exceso'], ownedAfter: ['balance', 'exceso', 'eco'] }, { phase: 'balance' }],
    ['balance count reaches 5 -> fusion_ready notification', { balanceCountAfterInsert: 5 }, { phase: 'balance' }],
    ['percibir already done today, nothing completes', { missions: { percibir: { progress_count: 1, completed_at: '2026-11-17 08:00:00' } } }, { phase: 'balance' }],
    ['coleccionista completes with the 3rd card of the day', { missions: { percibir: { progress_count: 2, completed_at: '2026-11-17 08:00:00' }, coleccionista: { progress_count: 2, completed_at: null } } }, { phase: 'balance' }],
    ['a duplicate still advances the daily missions', { existingSlotCount: 1 }, { phase: 'balance' }],
    [
      'both required missions done -> daily bonus (fusion not needed)',
      {
        missions: {
          percibir: { progress_count: 2, completed_at: '2026-11-17 08:00:00' },
          coleccionista: { progress_count: 2, completed_at: null },
        },
      },
      { phase: 'balance' },
    ],
    [
      'daily bonus already awarded today',
      {
        missions: {
          percibir: { progress_count: 2, completed_at: '2026-11-17 08:00:00' },
          coleccionista: { progress_count: 2, completed_at: null },
          bonus: { progress_count: 0, completed_at: '2026-11-17 09:00:00' },
        },
      },
      { phase: 'balance' },
    ],
    ['day 2 of a streak: no reward', { priorDays: ['2026-11-16'] }, { phase: 'balance' }],
    ['day 3 of a streak -> reward (+20 xp, energy refill, inbox notification)', { priorDays: ['2026-11-16', '2026-11-15'] }, { phase: 'balance' }],
    ['day 7 of a streak -> reward (+50 xp)', { priorDays: ['2026-11-16', '2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11'] }, { phase: 'balance' }],
    ['streak reward already claimed today', { priorDays: ['2026-11-16', '2026-11-15'], streakRewardClaimed: true }, { phase: 'balance' }],
    ['a gap breaks the streak: no reward', { priorDays: ['2026-11-15', '2026-11-14'] }, { phase: 'balance' }],
    ['species completed by this discovery', { ecoRoll: 0.01, ecoEligible: [7], ownedBefore: ['balance', 'exceso'], ownedAfter: ['balance', 'exceso', 'eco'] }, { phase: 'balance' }],
    ['species already complete before', { ownedBefore: ['balance', 'exceso', 'eco'] }, { phase: 'balance' }],
    ['an Eco duplicate of a complete species pays no species bonus', { ecoRoll: 0.01, ecoEligible: [7], ownedBefore: ['balance', 'exceso', 'eco'] }, { phase: 'balance' }],
    ['level up -> level_up notification', { xp: 5, random: 0.99 }, { phase: 'balance' }],
    ['no energy left -> 429', { energy: { energy_count: 0, energy_window_start: NOW.getTime(), unlimited_energy: 0 } }, { phase: 'balance' }],
    ['unlimited energy', { energy: { energy_count: 0, energy_window_start: null, unlimited_energy: 1 } }, { phase: 'balance' }],
    ['invalid JSON -> 400', {}, '{nope'],
    ['phase exceso -> 400', {}, { phase: 'exceso' }],
    ['missing phase -> 400', {}, {}],
    ['no active species -> 500', { activeSpeciesIds: [] }, { phase: 'balance' }],
    ['species/phase not found -> 404', { speciesRow: null }, { phase: 'balance' }],
    ['no rarity tiers -> 500', { tiers: [] }, { phase: 'balance' }],
  ];
  for (const [name, fx, body] of cases) {
    it(name, async () => {
      expect(await run('discover', fx, body)).toMatchSnapshot();
    });
  }
});

describe('economy golden master: POST /api/fuse', () => {
  const cases: [string, Fixture, unknown][] = [
    ['fuses 5 duplicates, common rarity', { oldestRows: five }, { speciesId: 7 }],
    ['epic rarity', { oldestRows: five, random: 0.99 }, { speciesId: 7 }],
    ['fusion mission completes', { oldestRows: five }, { speciesId: 7 }],
    [
      'fusion counts as a card: completes coleccionista -> daily bonus',
      {
        oldestRows: five,
        missions: {
          percibir: { progress_count: 2, completed_at: '2026-11-17 08:00:00' },
          coleccionista: { progress_count: 2, completed_at: null },
        },
      },
      { speciesId: 7 },
    ],
    ['fusion extends the streak and pays its milestone', { oldestRows: five, priorDays: ['2026-11-16', '2026-11-15'] }, { speciesId: 7 }],
    ['species completed by this fusion', { oldestRows: five, ownedBefore: ['balance', 'eco'], ownedAfter: ['balance', 'exceso', 'eco'] }, { speciesId: 7 }],
    ['species already complete before', { oldestRows: five, ownedBefore: ['balance', 'exceso', 'eco'] }, { speciesId: 7 }],
    ['level up -> level_up notification', { oldestRows: five, xp: 5, random: 0.99 }, { speciesId: 7 }],
    ['level 15+ fuses with only 4 duplicates', { oldestRows: five.slice(0, 4), xp: 5000 }, { speciesId: 7 }],
    ['not enough duplicates -> 409', { oldestRows: five.slice(0, 4) }, { speciesId: 7 }],
    ['invalid JSON -> 400', {}, '{nope'],
    ['missing speciesId -> 400', {}, {}],
    ['species/phase not found -> 404', { oldestRows: five, speciesRow: null }, { speciesId: 7 }],
    ['no rarity tiers -> 500', { oldestRows: five, tiers: [] }, { speciesId: 7 }],
  ];
  for (const [name, fx, body] of cases) {
    it(name, async () => {
      expect(await run('fuse', fx, body)).toMatchSnapshot();
    });
  }
});
