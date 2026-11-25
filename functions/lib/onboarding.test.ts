import { describe, it, expect, beforeEach } from 'vitest';
import { makeD1 } from './testD1';
import { getOnboardingState, markEcodexVisited, claimOnboardingReward, ONBOARDING_REWARD_XP } from './onboarding';
import { onRequestGet } from '../api/onboarding/index';
import { onRequestPost as postEcodex } from '../api/onboarding/ecodex';
import { onRequestPost as postClaim } from '../api/onboarding/claim';

let db: ReturnType<typeof makeD1>;

function addUser(id = 1, createdAt = "datetime('now')") {
  db.sqlite.exec(`INSERT INTO users (id, email, display_name, created_at) VALUES (${id}, 'u${id}@t.local', 'u${id}', ${createdAt})`);
  db.sqlite.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(`s${id}`, id, Date.now(), Date.now() + 1e7);
}

function completeEverything(userId = 1) {
  const s = db.sqlite;
  s.exec(`INSERT INTO discoveries (discovery_code, user_id, species_id, phase, rarity_tier_id, image_url) VALUES ('C1', ${userId}, 1, 'balance', 1, '/x.webp')`);
  s.exec(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (${userId}, 'https://e/1', 'p', 'a', datetime('now'))`);
  s.exec(`INSERT INTO daily_missions (user_id, mission_slug, day, progress_count, completed_at) VALUES (${userId}, 'percibir', '2026-11-25', 1, datetime('now'))`);
}

beforeEach(() => {
  db = makeD1();
  // Minimal FK targets for the rows the tests insert.
  const s = db.sqlite;
  s.exec('PRAGMA foreign_keys = OFF');
});

const stepsDone = (st: Awaited<ReturnType<typeof getOnboardingState>>) => st.steps.filter((x) => x.done).map((x) => x.slug);

describe('getOnboardingState', () => {
  it('starts with only the account step done, for a new account', async () => {
    addUser();
    const st = await getOnboardingState(db, 1);
    expect(st.eligible).toBe(true);
    expect(st.rewardClaimed).toBe(false);
    expect(stepsDone(st)).toEqual(['account']);
  });

  it('derives pack, push and mission from real data and ecodex from its marker', async () => {
    addUser();
    completeEverything();
    expect(stepsDone(await getOnboardingState(db, 1))).toEqual(['account', 'pack', 'push', 'mission']);
    await markEcodexVisited(db, 1);
    expect(stepsDone(await getOnboardingState(db, 1))).toEqual(['account', 'pack', 'ecodex', 'push', 'mission']);
  });

  it('does not count the daily bonus row as a completed mission', async () => {
    addUser();
    db.sqlite.exec(`INSERT INTO daily_missions (user_id, mission_slug, day, progress_count, completed_at) VALUES (1, 'bonus', '2026-11-25', 1, datetime('now'))`);
    expect(stepsDone(await getOnboardingState(db, 1))).toEqual(['account']);
  });

  it('is not eligible for an account older than the window', async () => {
    addUser(1, "datetime('now', '-15 days')");
    expect((await getOnboardingState(db, 1)).eligible).toBe(false);
  });

  it('marking the EcoDex twice leaves a single, already-read marker', async () => {
    addUser();
    await markEcodexVisited(db, 1);
    await markEcodexVisited(db, 1);
    const rows = db.sqlite.prepare("SELECT read_at FROM notifications WHERE user_id = 1 AND type = 'onboarding_ecodex'").all();
    expect(rows).toHaveLength(1);
    expect(rows[0].read_at).not.toBeNull();
  });
});

describe('claimOnboardingReward', () => {
  it('pays nothing while a step is missing', async () => {
    addUser();
    expect(await claimOnboardingReward(db, 1)).toBeNull();
    expect(db.sqlite.prepare('SELECT xp FROM users WHERE id = 1').get().xp).toBe(0);
  });

  it('pays +50 XP and refills energy once, then never again', async () => {
    addUser();
    completeEverything();
    await markEcodexVisited(db, 1);
    db.sqlite.exec('UPDATE users SET energy_count = 0, energy_window_start = 1000 WHERE id = 1');

    const first = await claimOnboardingReward(db, 1);
    expect(first?.xp.xpGained).toBe(ONBOARDING_REWARD_XP);
    expect(db.sqlite.prepare('SELECT xp, energy_count, energy_window_start FROM users WHERE id = 1').get()).toMatchObject({
      xp: ONBOARDING_REWARD_XP,
      energy_window_start: null,
    });
    expect((await getOnboardingState(db, 1)).rewardClaimed).toBe(true);

    expect(await claimOnboardingReward(db, 1)).toBeNull();
    expect(db.sqlite.prepare('SELECT xp FROM users WHERE id = 1').get().xp).toBe(ONBOARDING_REWARD_XP);
  });

  it('leaves the prize marker already read so it never reaches the bell', async () => {
    addUser();
    completeEverything();
    await markEcodexVisited(db, 1);
    await claimOnboardingReward(db, 1);
    const row = db.sqlite.prepare("SELECT read_at FROM notifications WHERE type = 'onboarding_reward'").get();
    expect(row.read_at).not.toBeNull();
  });

  it('never pays a veteran account, even with every step done', async () => {
    addUser(1, "datetime('now', '-30 days')");
    completeEverything();
    await markEcodexVisited(db, 1);
    expect(await claimOnboardingReward(db, 1)).toBeNull();
  });
});

describe('onboarding endpoints', () => {
  const call = (handler: PagesFunction<never>, path: string, method = 'GET', cookie: string | null = 's1') =>
    handler({
      request: new Request(`https://ecorex.app${path}`, { method, headers: cookie ? { Cookie: `ecorex_session=${cookie}` } : {} }),
      env: { DB: db },
    } as never);

  it('rejects unauthenticated calls', async () => {
    addUser();
    expect((await call(onRequestGet as never, '/api/onboarding', 'GET', null)).status).toBe(401);
    expect((await call(postEcodex as never, '/api/onboarding/ecodex', 'POST', null)).status).toBe(401);
    expect((await call(postClaim as never, '/api/onboarding/claim', 'POST', null)).status).toBe(401);
  });

  it('walks the whole flow: state, mark, claim, claim again', async () => {
    addUser();
    completeEverything();
    const before = (await (await call(onRequestGet as never, '/api/onboarding')).json()) as { steps: { slug: string; done: boolean }[] };
    expect(before.steps.find((s) => s.slug === 'ecodex')?.done).toBe(false);

    expect(await (await call(postClaim as never, '/api/onboarding/claim', 'POST')).json()).toEqual({ claimed: false });
    expect((await call(postEcodex as never, '/api/onboarding/ecodex', 'POST')).status).toBe(200);

    const claimed = (await (await call(postClaim as never, '/api/onboarding/claim', 'POST')).json()) as { claimed: boolean; xp: { xpGained: number } };
    expect(claimed.claimed).toBe(true);
    expect(claimed.xp.xpGained).toBe(ONBOARDING_REWARD_XP);
    expect(await (await call(postClaim as never, '/api/onboarding/claim', 'POST')).json()).toEqual({ claimed: false });
  });
});
