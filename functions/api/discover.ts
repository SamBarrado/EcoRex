import { getSessionCookie, verifySession } from "../lib/auth";
import { rateLimit, getClientIp } from "../lib/rateLimit";
import { generateDinoVariant } from "../lib/openai";
import { storeImageInR2 } from "../lib/r2";

interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  DINO_IMAGES: R2Bucket;
  OPENAI_API_KEY: string;
}

interface DiscoverBody {
  speciesId?: number;
  phase?: string;
}

interface SpeciesPhaseRow {
  species_id: number;
  scientific_name: string;
  common_name: string;
  fractae_child_name: string;
  physical_traits: string | null;
  base_palette: string | null;
  silhouette: string | null;
  anchor_image_url: string;
}

interface RarityTierRow {
  id: number;
  slug: string;
  name: string;
  anchor_probability: number;
  drop_weight: number;
}

const VALID_PHASES = ["calma", "furia", "eco"];

// Per-user discovery throttling: image-to-image variant generation calls a
// paid API, so this is intentionally tighter than the auth endpoints' limit.
const DISCOVER_RATE_LIMIT = 5;

function generateDiscoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomPart = (length: number): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  };
  return `DX-${randomPart(3)}-${randomPart(3)}`;
}

async function generateR2Key(): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(crypto.randomUUID())
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex}.png`;
}

function pickRarityTier(tiers: RarityTierRow[]): RarityTierRow {
  const totalWeight = tiers.reduce((sum, tier) => sum + tier.drop_weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tier of tiers) {
    roll -= tier.drop_weight;
    if (roll <= 0) return tier;
  }
  return tiers[tiers.length - 1];
}

function buildVariantPrompt(species: SpeciesPhaseRow, phase: string): string {
  const phaseModifier: Record<string, string> = {
    calma: "forma estable, postura serena, brillo suave",
    furia: "forma intensificada, postura agresiva, brillo ardiente, grietas de energía",
    eco: "forma translúcida, casi fantasmal, partículas dispersándose",
  };
  return [
    `A collectible cartoon dinosaur illustration for a children's app.`,
    `Species: ${species.common_name} (${species.scientific_name}).`,
    species.physical_traits ? `Physical traits: ${species.physical_traits}.` : null,
    species.base_palette ? `Palette: ${species.base_palette}.` : null,
    species.silhouette ? `Silhouette: ${species.silhouette}.` : null,
    `Fractae: ${species.fractae_child_name}.`,
    `Phase modifier (${phase}): ${phaseModifier[phase]}.`,
    `Colorful, simple, no text, no watermark.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const allowed = await rateLimit(env.RATE_LIMIT_KV, `discover:${user.id}:${ip}`, DISCOVER_RATE_LIMIT);
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: DiscoverBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const speciesId = body.speciesId;
  const phase = body.phase;

  if (typeof speciesId !== "number" || !phase || !VALID_PHASES.includes(phase)) {
    return Response.json({ error: "speciesId and a valid phase are required" }, { status: 400 });
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
  const servesAnchor = Math.random() < rarityTier.anchor_probability;

  let imageUrl: string;
  let isUniqueVariant: boolean;

  if (servesAnchor) {
    imageUrl = speciesRow.anchor_image_url;
    isUniqueVariant = false;
  } else {
    try {
      const anchorUrl = new URL(speciesRow.anchor_image_url, request.url).toString();
      const anchorResponse = await fetch(anchorUrl);
      if (!anchorResponse.ok) {
        throw new Error(`Failed to fetch anchor image: ${anchorResponse.status}`);
      }
      const anchorBytes = await anchorResponse.arrayBuffer();
      const prompt = buildVariantPrompt(speciesRow, phase);
      const base64Image = await generateDinoVariant(anchorBytes, prompt, env.OPENAI_API_KEY);

      const r2Key = await generateR2Key();
      await storeImageInR2(env.DINO_IMAGES, r2Key, base64Image);

      imageUrl = `/images/${r2Key}`;
      isUniqueVariant = true;
    } catch (err) {
      console.error("discover variant generation failed:", err instanceof Error ? err.stack : err);
      return Response.json({ error: "Failed to generate discovery image" }, { status: 502 });
    }
  }

  const discoveryCode = generateDiscoveryCode();

  const insertResult = await env.DB.prepare(
    `INSERT INTO discoveries
       (discovery_code, user_id, species_id, phase, rarity_tier_id, image_url, is_unique_variant)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(discoveryCode, user.id, speciesId, phase, rarityTier.id, imageUrl, isUniqueVariant ? 1 : 0)
    .run();

  const discoveryId = insertResult.meta.last_row_id;
  const discoveredAtRow = await env.DB.prepare(
    "SELECT discovered_at FROM discoveries WHERE id = ?"
  )
    .bind(discoveryId)
    .first<{ discovered_at: string }>();

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
      isUniqueVariant,
      discoveredAt: discoveredAtRow?.discovered_at ?? null,
    },
    { status: 201 }
  );
};
