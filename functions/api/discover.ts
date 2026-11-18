import { getSessionCookie, verifySession } from "../lib/auth";
import { consumeEnergy } from "../lib/energy";
import { levelFromXp, RARITY_XP } from "../lib/xp";
import { loadSpeciesPhase, rollRarityTier, recordDiscovery, discoveryResponseBody } from "../lib/recordDiscovery";
import { ECO_DROP_CHANCE, loadEcoEligibleSpeciesIds } from "../lib/discovery";

interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
}

interface DiscoverBody {
  phase?: string;
}

// The client only ever asks for "balance" (= percibir). Exceso comes from the
// Altar de Fusión and Eco is a rare drop the server rolls itself (see below).
const VALID_PHASES = ["balance"];

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

  const requestedPhase = body.phase;

  if (!requestedPhase || !VALID_PHASES.includes(requestedPhase)) {
    if (requestedPhase === "exceso") {
      return Response.json(
        { error: "Exceso solo se obtiene fusionando duplicados de Balance" },
        { status: 400 }
      );
    }
    if (requestedPhase === "eco") {
      return Response.json({ error: "Eco no se elige: puede aparecer al percibir" }, { status: 400 });
    }
    return Response.json({ error: "A valid phase is required" }, { status: 400 });
  }

  const { results: activeSpeciesIds } = await env.DB.prepare(
    "SELECT id FROM species WHERE is_active = 1"
  ).all<{ id: number }>();

  if (activeSpeciesIds.length === 0) {
    return Response.json({ error: "No hay especies activas para descubrir" }, { status: 500 });
  }

  const pick = (ids: number[]) => ids[crypto.getRandomValues(new Uint32Array(1))[0] % ids.length];

  let phase = "balance";
  let speciesId = pick(activeSpeciesIds.map((row) => row.id));

  // Rare Eco drop. Only for a species the player already has the Balance of;
  // with none eligible (e.g. a brand-new account) the roll simply falls back
  // to a normal Balance pull.
  if (Math.random() < ECO_DROP_CHANCE) {
    const ecoSpeciesIds = await loadEcoEligibleSpeciesIds(env.DB, user.id);
    if (ecoSpeciesIds.length > 0) {
      phase = "eco";
      speciesId = pick(ecoSpeciesIds);
    }
  }

  const speciesRow = await loadSpeciesPhase(env.DB, speciesId, phase);

  if (!speciesRow) {
    return Response.json({ error: "Species/phase combination not found" }, { status: 404 });
  }

  const rarityTier = await rollRarityTier(env.DB);

  if (!rarityTier) {
    return Response.json({ error: "No rarity tiers configured" }, { status: 500 });
  }

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

  const result = await recordDiscovery({
    db: env.DB,
    userId: user.id,
    species: speciesRow,
    phase,
    rarityTier,
    // Only a new slot pays the rarity XP; duplicates give 0.
    rarityXp: isNewSlot ? (RARITY_XP[rarityTier.slug] ?? 0) : 0,
    // Every card counts for the daily missions, new or duplicate: they must be
    // completable even once the catalog is fully collected.
    missions: ["percibir", "coleccionista"],
    afterInsert: async () => {
      if (phase !== "balance") return;
      const countRow = await env.DB.prepare(
        `SELECT COUNT(*) as balance_count FROM discoveries
       WHERE user_id = ? AND species_id = ? AND phase = 'balance' AND consumed_at IS NULL`
      )
        .bind(user.id, speciesId)
        .first<{ balance_count: number }>();

      if (countRow?.balance_count === 5) {
        await env.DB.prepare(`INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)`)
          .bind(user.id, "fusion_ready", JSON.stringify({ speciesId, commonName: speciesRow.common_name }))
          .run();
      }
    },
  });

  return Response.json({ ...discoveryResponseBody(speciesRow, phase, rarityTier, result), isNewSlot }, { status: 201 });
};
