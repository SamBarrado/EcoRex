import type { DraftStatus } from "./discovery";

export interface DraftRow {
  id: number;
  genus: string;
  fractae: string;
  edition: string;
  taxon_group: string;
  status: DraftStatus;
  spec_json: string | null;
  sources_json: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export const getDraft = (db: D1Database, id: number) =>
  db.prepare("SELECT * FROM species_drafts WHERE id = ?").bind(id).first<DraftRow>();

/**
 * Appends a spec version and makes it the draft's current spec, atomically.
 * Versions are never edited: a change is always a new row.
 */
export async function addVersion(
  db: D1Database,
  draftId: number,
  spec: unknown,
  origin: "ai" | "human",
  userId: number,
  note?: string
): Promise<void> {
  const json = JSON.stringify(spec);
  await db.batch([
    db
      .prepare(
        `INSERT INTO spec_versions (draft_id, version, spec_json, origin, note, created_by)
         VALUES (?, (SELECT COALESCE(MAX(version), 0) + 1 FROM spec_versions WHERE draft_id = ?), ?, ?, ?, ?)`
      )
      .bind(draftId, draftId, json, origin, note ?? null, userId),
    db.prepare("UPDATE species_drafts SET spec_json = ?, updated_at = datetime('now') WHERE id = ?").bind(json, draftId),
  ]);
}

export function parseId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
