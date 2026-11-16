import { hasCompletedAllPhases, pickRarityTier, type RarityTierRow, type SpeciesPhaseRow } from "./discovery";
import { addXp, SPECIES_COMPLETE_XP_BONUS } from "./xp";
import {
  incrementMission,
  checkAndAwardDailyBonus,
  todayUTC,
  MISSION_DEFS,
  DAILY_BONUS_XP,
  type MissionSlug,
} from "./missions";

// Shared flow behind POST /api/discover and POST /api/fuse: both end up
// creating one `discoveries` row for a species+phase with a rolled rarity and
// then settling the rewards (rarity XP, species-complete bonus, daily
// missions, daily bonus, level-up notification). The endpoints keep what is
// genuinely theirs (auth, energy vs rate limit, input validation, which phase
// and which rewards apply, and their own side effects via `afterInsert`).

const ALL_PHASES = ["balance", "exceso", "eco"] as const;

function generateDiscoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomPart = (length: number): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  };
  return `DX-${randomPart(3)}-${randomPart(3)}`;
}

export async function loadSpeciesPhase(db: D1Database, speciesId: number, phase: string): Promise<SpeciesPhaseRow | null> {
  return db
    .prepare(
      `SELECT
       species.id as species_id,
       species.scientific_name as scientific_name,
       species.common_name as common_name,
       fractae.child_name as fractae_child_name,
       species_phase_anchors.image_url as anchor_image_url,
       species_phase_anchors.lore_phrase as lore_phrase
     FROM species
     JOIN fractae ON fractae.id = species.fractae_id
     JOIN species_phase_anchors ON species_phase_anchors.species_id = species.id
     WHERE species.id = ? AND species_phase_anchors.phase = ? AND species.is_active = 1`
    )
    .bind(speciesId, phase)
    .first<SpeciesPhaseRow>();
}

/** Rolls a rarity tier by drop weight, or returns null when none are configured. */
export async function rollRarityTier(db: D1Database): Promise<RarityTierRow | null> {
  const { results } = await db
    .prepare("SELECT id, slug, name, drop_weight FROM rarity_tiers")
    .all<RarityTierRow>();
  if (results.length === 0) return null;
  return pickRarityTier(results);
}

export interface RecordDiscoveryParams {
  db: D1Database;
  userId: number;
  species: SpeciesPhaseRow;
  phase: string;
  rarityTier: RarityTierRow;
  /** XP for the rarity roll itself (the endpoints use different tables / rules). */
  rarityXp: number;
  /** Daily missions this action advances, in order. */
  missions: MissionSlug[];
  /** Endpoint-specific writes, run right after the discovery row exists. */
  afterInsert?: () => Promise<void>;
}

export interface RecordDiscoveryResult {
  discoveryId: number;
  discoveryCode: string;
  discoveredAt: string | null;
  xp: { xpGained: number; totalXp: number; level: number; previousLevel: number; leveledUp: boolean };
  missionsCompleted: string[];
  dailyBonusAwarded: boolean;
}

export async function recordDiscovery(params: RecordDiscoveryParams): Promise<RecordDiscoveryResult> {
  const { db, userId, species, phase, rarityTier, rarityXp, missions, afterInsert } = params;
  const speciesId = species.species_id;

  const wasCompleteBefore = await hasCompletedAllPhases(db, userId, speciesId, ALL_PHASES);

  const discoveryCode = generateDiscoveryCode();
  const insertResult = await db
    .prepare(
      `INSERT INTO discoveries
       (discovery_code, user_id, species_id, phase, rarity_tier_id, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(discoveryCode, userId, speciesId, phase, rarityTier.id, species.anchor_image_url)
    .run();
  const discoveryId = insertResult.meta.last_row_id;

  const discoveredAtRow = await db
    .prepare("SELECT discovered_at FROM discoveries WHERE id = ?")
    .bind(discoveryId)
    .first<{ discovered_at: string }>();

  if (afterInsert) await afterInsert();

  const isCompleteAfter = await hasCompletedAllPhases(db, userId, speciesId, ALL_PHASES);
  const justCompletedSpecies = !wasCompleteBefore && isCompleteAfter;
  let xpAmount = rarityXp + (justCompletedSpecies ? SPECIES_COMPLETE_XP_BONUS : 0);

  const missionsCompleted: string[] = [];
  const day = todayUTC();

  for (const slug of missions) {
    const mission = await incrementMission(db, userId, slug, day);
    if (mission.completedNow) {
      xpAmount += MISSION_DEFS[slug].xp;
      missionsCompleted.push(slug);
    }
  }

  const dailyBonusAwarded = await checkAndAwardDailyBonus(db, userId, day);
  if (dailyBonusAwarded) {
    xpAmount += DAILY_BONUS_XP;
    missionsCompleted.push("bonus");
  }

  const xpResult = await addXp(db, userId, xpAmount);

  if (xpResult.leveledUp) {
    await db
      .prepare(`INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)`)
      .bind(userId, "level_up", JSON.stringify({ newLevel: xpResult.level }))
      .run();
  }

  return {
    discoveryId,
    discoveryCode,
    discoveredAt: discoveredAtRow?.discovered_at ?? null,
    xp: {
      xpGained: xpResult.xpGained,
      totalXp: xpResult.totalXp,
      level: xpResult.level,
      previousLevel: xpResult.previousLevel,
      leveledUp: xpResult.leveledUp,
    },
    missionsCompleted,
    dailyBonusAwarded,
  };
}

/** The response fields both endpoints share. */
export function discoveryResponseBody(
  species: SpeciesPhaseRow,
  phase: string,
  rarityTier: RarityTierRow,
  result: RecordDiscoveryResult
) {
  return {
    discoveryId: result.discoveryId,
    discoveryCode: result.discoveryCode,
    speciesId: species.species_id,
    scientificName: species.scientific_name,
    commonName: species.common_name,
    phase,
    rarityTier: { slug: rarityTier.slug, name: rarityTier.name },
    imageUrl: species.anchor_image_url,
    lorePhrase: species.lore_phrase,
    discoveredAt: result.discoveredAt,
    xp: result.xp,
    missionsCompleted: result.missionsCompleted,
    dailyBonusAwarded: result.dailyBonusAwarded,
  };
}
