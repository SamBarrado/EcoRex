import { getSessionCookie, verifySession } from "../../lib/auth";
import { rateLimit, getClientIp } from "../../lib/rateLimit";
import { pickRarityTier, resolvePhaseImage, hasCompletedAllPhases, type RarityTierRow, type SpeciesPhaseRow } from "../../lib/discovery";
import { addXp, RARITY_XP, FUSION_XP_BONUS, SPECIES_COMPLETE_XP_BONUS } from "../../lib/xp";

interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  DINO_IMAGES: R2Bucket;
  OPENAI_API_KEY: string;
}

interface FuseBody {
  speciesId?: number;
}

const FUSE_THRESHOLD = 5;
const DEFAULT_FUSE_RATE_LIMIT = 10;

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

  const ip = getClientIp(request);
  const allowed = await rateLimit(env.RATE_LIMIT_KV, `fuse:${user.id}:${ip}`, DEFAULT_FUSE_RATE_LIMIT);
  if (!allowed) {
    return Response.json(
      { error: "Has hecho muchas fusiones seguidas. Espera un poco y vuelve a intentarlo." },
      { status: 429 }
    );
  }

  let body: FuseBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const speciesId = body.speciesId;
  if (typeof speciesId !== "number") {
    return Response.json({ error: "speciesId is required" }, { status: 400 });
  }

  const { results: oldestRows } = await env.DB.prepare(
    `SELECT id FROM discoveries
     WHERE user_id = ? AND species_id = ? AND phase = 'calma' AND consumed_at IS NULL
     ORDER BY discovered_at ASC
     LIMIT ?`
  )
    .bind(user.id, speciesId, FUSE_THRESHOLD)
    .all<{ id: number }>();

  if (oldestRows.length < FUSE_THRESHOLD) {
    return Response.json(
      { error: "No tienes suficientes duplicados de Calma para esta especie" },
      { status: 409 }
    );
  }

  const speciesRow = await env.DB.prepare(
    `SELECT
       species.id as species_id,
       species.scientific_name as scientific_name,
       species.common_name as common_name,
       species.physical_traits as physical_traits,
       species.base_palette as base_palette,
       species.silhouette as silhouette,
       fractae.child_name as fractae_child_name,
       species_phase_anchors.image_url as anchor_image_url
     FROM species
     JOIN fractae ON fractae.id = species.fractae_id
     JOIN species_phase_anchors ON species_phase_anchors.species_id = species.id
     WHERE species.id = ? AND species_phase_anchors.phase = 'exceso' AND species.is_active = 1`
  )
    .bind(speciesId)
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

  let imageUrl: string;
  let isUniqueVariant: boolean;
  try {
    const resolved = await resolvePhaseImage({
      species: speciesRow,
      phase: "exceso",
      rarityTier,
      requestUrl: request.url,
      openaiApiKey: env.OPENAI_API_KEY,
      r2Bucket: env.DINO_IMAGES,
    });
    imageUrl = resolved.imageUrl;
    isUniqueVariant = resolved.isUniqueVariant;
  } catch (err) {
    console.error("fuse variant generation failed:", err instanceof Error ? err.stack : err);
    return Response.json({ error: "Failed to generate fusion image" }, { status: 502 });
  }

  const discoveryCode = generateDiscoveryCode();
  const insertResult = await env.DB.prepare(
    `INSERT INTO discoveries
       (discovery_code, user_id, species_id, phase, rarity_tier_id, image_url, is_unique_variant)
     VALUES (?, ?, ?, 'exceso', ?, ?, ?)`
  )
    .bind(discoveryCode, user.id, speciesId, rarityTier.id, imageUrl, isUniqueVariant ? 1 : 0)
    .run();

  const discoveryId = insertResult.meta.last_row_id;

  const idsToConsume = oldestRows.map((row) => row.id);
  for (const id of idsToConsume) {
    await env.DB.prepare("UPDATE discoveries SET consumed_at = datetime('now') WHERE id = ?").bind(id).run();
  }

  const discoveredAtRow = await env.DB.prepare("SELECT discovered_at FROM discoveries WHERE id = ?")
    .bind(discoveryId)
    .first<{ discovered_at: string }>();

  const completedSpecies = await hasCompletedAllPhases(env.DB, user.id, speciesId, ["calma", "exceso", "eco"]);
  const xpAmount =
    (RARITY_XP[rarityTier.slug] ?? 0) + FUSION_XP_BONUS + (completedSpecies ? SPECIES_COMPLETE_XP_BONUS : 0);
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
      phase: "exceso",
      rarityTier: { slug: rarityTier.slug, name: rarityTier.name },
      imageUrl,
      isUniqueVariant,
      discoveredAt: discoveredAtRow?.discovered_at ?? null,
      xp: {
        xpGained: xpResult.xpGained,
        totalXp: xpResult.totalXp,
        level: xpResult.level,
        leveledUp: xpResult.leveledUp,
      },
    },
    { status: 201 }
  );
};
