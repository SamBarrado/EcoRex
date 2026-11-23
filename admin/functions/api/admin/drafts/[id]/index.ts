import { isEditable } from "../../../../lib/discovery";
import { addVersion, getDraft, parseId } from "../../../../lib/drafts";
import { hasErrors, validateSpec } from "../../../../lib/specContract";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../../lib/adminAuth";

type Ctx = { admin: AdminContext };

export const onRequestGet: PagesFunction<AdminEnv, "id", Ctx> = async ({ params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");
  const { results } = await env.DB.prepare(
    "SELECT version, origin, note, created_by, created_at FROM spec_versions WHERE draft_id = ? ORDER BY version DESC"
  )
    .bind(draft.id)
    .all();
  const species = draft.species_id
    ? await env.DB.prepare("SELECT is_active, (SELECT COUNT(*) FROM species_phase_anchors a WHERE a.species_id = species.id) AS anchors FROM species WHERE id = ?").bind(draft.species_id).first()
    : null;
  return Response.json({
    species,
    draft: {
      ...draft,
      spec: draft.spec_json ? JSON.parse(draft.spec_json) : null,
      sources: draft.sources_json ? JSON.parse(draft.sources_json) : null,
      spec_json: undefined,
      sources_json: undefined,
    },
    issues: draft.spec_json ? validateSpec(JSON.parse(draft.spec_json)) : [],
    versions: results,
  });
};

/** PATCH {spec, note?} — a human edit; creates a NEW version. Approved sheets can't be edited. */
export const onRequestPatch: PagesFunction<AdminEnv, "id", Ctx> = async ({ request, params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");
  if (!isEditable(draft.status)) return jsonError(409, `Un borrador en estado "${draft.status}" no se puede editar`);

  let body: { spec?: unknown; note?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "JSON no válido");
  }
  const issues = validateSpec(body.spec);
  // Work in progress may have warnings, but a structurally broken sheet is not stored.
  if (hasErrors(issues)) return Response.json({ error: "Ficha no válida", issues }, { status: 422 });

  await addVersion(env.DB, draft.id, body.spec, "human", data.admin.user.id, body.note?.slice(0, 500));
  await writeAudit(env.DB, data.admin.user.id, "draft.edit", `draft:${draft.id}`);
  return Response.json({ ok: true, issues });
};
