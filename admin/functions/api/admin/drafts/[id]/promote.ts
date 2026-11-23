import { getDraft, parseId } from "../../../../lib/drafts";
import { parseWave, promoteDraft, unpromoteDraft } from "../../../../lib/promotion";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../../lib/adminAuth";

type Ctx = { admin: AdminContext };

/** POST {launchWave} — promotes an approved draft into `species`, INACTIVE (never visible to players). */
export const onRequestPost: PagesFunction<AdminEnv, "id", Ctx> = async ({ request, params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");
  const body = (await request.json().catch(() => ({}))) as { launchWave?: unknown };
  const wave = parseWave(body.launchWave);
  if (!wave) return jsonError(400, "Oleada no válida (entero de 1 a 99)");

  const r = await promoteDraft(env.DB, draft, wave);
  if (!r.ok) return Response.json({ error: r.error, blockers: r.blockers }, { status: r.status });
  await writeAudit(env.DB, data.admin.user.id, "draft.promote", `draft:${draft.id}`, { launchWave: wave });
  return Response.json({ ok: true });
};

/** DELETE — undoes a promotion while the species is still inactive, art-less and undiscovered. */
export const onRequestDelete: PagesFunction<AdminEnv, "id", Ctx> = async ({ params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");

  const speciesId = draft.species_id;
  const r = await unpromoteDraft(env.DB, draft);
  if (!r.ok) return jsonError(r.status, r.error);
  await writeAudit(env.DB, data.admin.user.id, "draft.unpromote", `draft:${draft.id}`, { speciesId });
  return Response.json({ ok: true });
};
