import { getSessionCookie, verifySession } from "../../lib/auth";
import { rateLimit, getClientIp } from "../../lib/rateLimit";
import { FUSION_RARITY_XP, levelFromXp, fusionThresholdReductionForLevel } from "../../lib/xp";
import { loadSpeciesPhase, rollRarityTier, recordDiscovery, discoveryResponseBody } from "../../lib/recordDiscovery";

interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
}

interface FuseBody {
  speciesId?: number;
}

const BASE_FUSE_THRESHOLD = 5;
const DEFAULT_FUSE_RATE_LIMIT = 10;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const sessionId = getSessionCookie(request);
  const user = sessionId ? await verifySession(env.DB, sessionId) : null;
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const level = levelFromXp(user.xp);
  const fuseThreshold = BASE_FUSE_THRESHOLD - fusionThresholdReductionForLevel(level);

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
     WHERE user_id = ? AND species_id = ? AND phase = 'balance' AND consumed_at IS NULL
     ORDER BY discovered_at ASC
     LIMIT ?`
  )
    .bind(user.id, speciesId, fuseThreshold)
    .all<{ id: number }>();

  if (oldestRows.length < fuseThreshold) {
    return Response.json(
      { error: "No tienes suficientes duplicados de Balance para esta especie" },
      { status: 409 }
    );
  }

  const speciesRow = await loadSpeciesPhase(env.DB, speciesId, "exceso");

  if (!speciesRow) {
    return Response.json({ error: "Species/phase combination not found" }, { status: 404 });
  }

  const rarityTier = await rollRarityTier(env.DB);

  if (!rarityTier) {
    return Response.json({ error: "No rarity tiers configured" }, { status: 500 });
  }

  const result = await recordDiscovery({
    db: env.DB,
    userId: user.id,
    species: speciesRow,
    phase: "exceso",
    rarityTier,
    rarityXp: FUSION_RARITY_XP[rarityTier.slug] ?? 0,
    missions: ["fusion", "coleccionista"],
    afterInsert: async () => {
      for (const { id } of oldestRows) {
        await env.DB.prepare("UPDATE discoveries SET consumed_at = datetime('now') WHERE id = ?").bind(id).run();
      }

      // Fusing clears the "you can fuse this" reminder for this species, whether
      // or not the user got here by tapping that specific notification.
      await env.DB.prepare(
        `UPDATE notifications SET read_at = datetime('now')
     WHERE user_id = ? AND type = 'fusion_ready' AND read_at IS NULL
       AND json_extract(payload, '$.speciesId') = ?`
      )
        .bind(user.id, speciesId)
        .run();
    },
  });

  return Response.json(discoveryResponseBody(speciesRow, "exceso", rarityTier, result), { status: 201 });
};
