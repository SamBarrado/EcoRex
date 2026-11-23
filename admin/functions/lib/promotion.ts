// Species Manager: promoting an approved draft into the game's `species` table, and undoing it.
// A promoted species fills a reserved '???' Dex slot in place and stays inactive (is_active = 0):
// it only reaches players once curated art exists and someone activates it (a later step).
import { approvalBlockers } from "./discovery";
import type { DraftRow } from "./drafts";
import type { SpecSheet } from "./specContract";

export type PromoteResult = { ok: true } | { ok: false; status: number; error: string; blockers?: string[] };

export function parseWave(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

export async function promoteDraft(db: D1Database, draft: DraftRow, launchWave: number): Promise<PromoteResult> {
  if (draft.status !== "approved") return { ok: false, status: 409, error: `Solo se promueve un borrador aprobado (estado: "${draft.status}")` };
  const spec = draft.spec_json ? (JSON.parse(draft.spec_json) as SpecSheet) : null;
  const blockers = approvalBlockers(spec);
  if (!spec || blockers.length) return { ok: false, status: 422, error: "La ficha no está completa", blockers };

  const fractae = await db.prepare("SELECT id FROM fractae WHERE child_name = ?").bind(spec.fractae.name).first<{ id: number }>();
  if (!fractae) return { ok: false, status: 422, error: `El Fractae "${spec.fractae.name}" no existe en la base de datos (¿falta añadirlo al seed?)` };
  const dup = await db.prepare("SELECT id FROM species WHERE scientific_name = ?").bind(spec.scientificName).first();
  if (dup) return { ok: false, status: 409, error: `Ya existe una especie con el nombre científico "${spec.scientificName}"` };

  // The Dex reserves 24 slots per wave as '???' rows (scripts/seed.sql); a designed species
  // takes one IN PLACE (same id, never renumbered). Prefer a slot of its own Fractae.
  const slot = await db
    .prepare(
      `SELECT id FROM species WHERE scientific_name = '???' AND is_active = 0 AND launch_wave = ?
         AND NOT EXISTS (SELECT 1 FROM species_phase_anchors a WHERE a.species_id = species.id)
         AND NOT EXISTS (SELECT 1 FROM discoveries d WHERE d.species_id = species.id)
       ORDER BY (fractae_id = ?) DESC, id LIMIT 1`
    )
    .bind(launchWave, fractae.id)
    .first<{ id: number }>();
  if (!slot) return { ok: false, status: 409, error: `La oleada ${launchWave} no tiene huecos «???» libres` };

  // One batch: either the slot is filled and the link set, or neither.
  await db.batch([
    db
      .prepare(
        `UPDATE species SET scientific_name = ?, common_name = ?, fractae_id = ?, physical_traits = ?, base_palette = ?, silhouette = ?
         WHERE id = ? AND scientific_name = '???' AND is_active = 0`
      )
      .bind(spec.scientificName, spec.commonName, fractae.id, spec.traits, spec.palette, spec.silhouette, slot.id),
    db.prepare("UPDATE species_drafts SET status = 'promoted', species_id = ?, updated_at = datetime('now') WHERE id = ?").bind(slot.id, draft.id),
  ]);
  return { ok: true };
}

/** Undo: only while the species is still invisible, art-less and undiscovered. Never touches a live species; the slot goes back to '???'. */
export async function unpromoteDraft(db: D1Database, draft: DraftRow): Promise<PromoteResult> {
  if (draft.status !== "promoted" || !draft.species_id) return { ok: false, status: 409, error: "El borrador no está promovido" };
  const sp = await db.prepare("SELECT is_active FROM species WHERE id = ?").bind(draft.species_id).first<{ is_active: number }>();
  if (!sp) return { ok: false, status: 409, error: "La especie ya no existe" };
  if (sp.is_active) return { ok: false, status: 409, error: "La especie está activa en el juego: desactívala antes" };
  const anchors = await db.prepare("SELECT COUNT(*) AS n FROM species_phase_anchors WHERE species_id = ?").bind(draft.species_id).first<{ n: number }>();
  if (anchors?.n) return { ok: false, status: 409, error: "La especie ya tiene imágenes ancla" };
  const found = await db.prepare("SELECT COUNT(*) AS n FROM discoveries WHERE species_id = ?").bind(draft.species_id).first<{ n: number }>();
  if (found?.n) return { ok: false, status: 409, error: "Hay jugadores con cartas de esta especie" };

  await db.batch([
    db.prepare("UPDATE species_drafts SET status = 'approved', species_id = NULL, updated_at = datetime('now') WHERE id = ?").bind(draft.id),
    // Back to a '???' placeholder: the id is never freed (seed.sql: "never renumber").
    db
      .prepare(
        "UPDATE species SET scientific_name = '???', common_name = '???', physical_traits = NULL, base_palette = NULL, silhouette = NULL WHERE id = ? AND is_active = 0"
      )
      .bind(draft.species_id),
  ]);
  return { ok: true };
}
