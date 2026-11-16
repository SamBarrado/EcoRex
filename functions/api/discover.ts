import { getSessionCookie, verifySession } from "../lib/auth";
import { consumeEnergy } from "../lib/energy";
import { pickRarityTier, hasCompletedAllPhases, type RarityTierRow, type SpeciesPhaseRow } from "../lib/discovery";
import { addXp, levelFromXp, RARITY_XP, SPECIES_COMPLETE_XP_BONUS } from "../lib/xp";
import { incrementMission, checkAndAwardDailyBonus, todayUTC, MISSION_DEFS, DAILY_BONUS_XP } from "../lib/missions";

interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
}

interface DiscoverBody {
  phase?: string;
}

const VALID_PHASES = ["balance", "eco"];

function generateDiscoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomPart = (length: number): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  };
  return `DX-${randomPart(3)}-${randomPart(3)}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const energy = await consumeEnergy(env.DB, user.id, levelFromXp(user.xp));
  if (!energy.success) {
    return Response.json(
      { error: "No te queda energía para percibir. Vuelve más tarde.", resetAt: energy.resetAt },
      { status: 429 }
    );
  }

  let body: DiscoverBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phase = body.phase;

  if (!phase || !VALID_PHASES.includes(phase)) {
    if (phase === "exceso") {
      return Response.json(
        { error: "Exceso solo se obtiene fusionando duplicados de Balance" },
        { status: 400 }
      );
    }
    return Response.json({ error: "A valid phase is required" }, { status: 400 });
  }

  const { results: activeSpeciesIds } = await env.DB.prepare(
    "SELECT id FROM species WHERE is_active = 1"
  ).all<{ id: number }>();

  if (activeSpeciesIds.length === 0) {
    return Response.json({ error: "No hay especies activas para descubrir" }, { status: 500 });
  }

  const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % activeSpeciesIds.length;
  const speciesId = activeSpeciesIds[randomIndex].id;

  const speciesRow = await env.DB.prepare(
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

  if (!speciesRow) {
    return Response.json({ error: "Species/phase combination not found" }, { status: 404 });
  }

  const { results: rarityTiers } = await env.DB.prepare(
    "SELECT id, slug, name, anchor_probability, drop_weight FROM rarity_tiers"
  ).all<RarityTierRow>();

  if (rarityTiers.length === 0) {
    return Response.json({ error: "No rarity tiers configured" }, { status: 500 });
  }

  const rarityTier = pickRarityTier(rarityTiers);

  // Registration is permanent once any discovery exists for this species+phase,
  // even if every copy has since been consumed by a fusion — matches the dex's
  // own locked/registered logic, so a re-discovery after fusing doesn't wrongly
  // replay the "new species" reveal.
  const existingSlotCountRow = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM discoveries
     WHERE user_id = ? AND species_id = ? AND phase = ?`
  )
    .bind(user.id, speciesId, phase)
    .first<{ count: number }>();
  const isNewSlot = (existingSlotCountRow?.count ?? 0) === 0;

  const imageUrl = speciesRow.anchor_image_url;

  const wasCompleteBefore = await hasCompletedAllPhases(env.DB, user.id, speciesId, ["balance", "exceso", "eco"]);

  const discoveryCode = generateDiscoveryCode();

  const insertResult = await env.DB.prepare(
    `INSERT INTO discoveries
       (discovery_code, user_id, species_id, phase, rarity_tier_id, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(discoveryCode, user.id, speciesId, phase, rarityTier.id, imageUrl)
    .run();

  const discoveryId = insertResult.meta.last_row_id;
  const discoveredAtRow = await env.DB.prepare(
    "SELECT discovered_at FROM discoveries WHERE id = ?"
  )
    .bind(discoveryId)
    .first<{ discovered_at: string }>();

  if (phase === "balance") {
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as balance_count FROM discoveries
       WHERE user_id = ? AND species_id = ? AND phase = 'balance' AND consumed_at IS NULL`
    )
      .bind(user.id, speciesId)
      .first<{ balance_count: number }>();

    if (countRow?.balance_count === 5) {
      await env.DB.prepare(
        `INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)`
      )
        .bind(
          user.id,
          "fusion_ready",
          JSON.stringify({ speciesId, commonName: speciesRow.common_name })
        )
        .run();
    }
  }

  const isCompleteAfter = await hasCompletedAllPhases(env.DB, user.id, speciesId, ["balance", "exceso", "eco"]);
  const justCompletedSpecies = !wasCompleteBefore && isCompleteAfter;
  let xpAmount = (isNewSlot ? (RARITY_XP[rarityTier.slug] ?? 0) : 0) + (justCompletedSpecies ? SPECIES_COMPLETE_XP_BONUS : 0);

  const missionsCompleted: string[] = [];
  const day = todayUTC();

  const percibirMission = await incrementMission(env.DB, user.id, 'percibir', day);
  if (percibirMission.completedNow) {
    xpAmount += MISSION_DEFS.percibir.xp;
    missionsCompleted.push('percibir');
  }

  if (isNewSlot) {
    const coleccionistaMission = await incrementMission(env.DB, user.id, 'coleccionista', day);
    if (coleccionistaMission.completedNow) {
      xpAmount += MISSION_DEFS.coleccionista.xp;
      missionsCompleted.push('coleccionista');
    }
  }

  const dailyBonusAwarded = await checkAndAwardDailyBonus(env.DB, user.id, day);
  if (dailyBonusAwarded) {
    xpAmount += DAILY_BONUS_XP;
    missionsCompleted.push('bonus');
  }

  const xpResult = await addXp(env.DB, user.id, xpAmount);

  if (xpResult.leveledUp) {
    await env.DB.prepare(`INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)`)
      .bind(user.id, "level_up", JSON.stringify({ newLevel: xpResult.level }))
      .run();
  }

  return Response.json(
    {
      discoveryId,
      discoveryCode,
      speciesId,
      scientificName: speciesRow.scientific_name,
      commonName: speciesRow.common_name,
      phase,
      rarityTier: { slug: rarityTier.slug, name: rarityTier.name },
      imageUrl,
      lorePhrase: speciesRow.lore_phrase,
      isNewSlot,
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
    },
    { status: 201 }
  );
};
