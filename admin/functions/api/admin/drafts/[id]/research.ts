import { canTransition, research } from "../../../../lib/discovery";
import { getDraft, parseId } from "../../../../lib/drafts";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../../lib/adminAuth";

/** POST — consults the 3 real sources and stores their answers + consult date. Free. */
export const onRequestPost: PagesFunction<AdminEnv, "id", { admin: AdminContext }> = async ({ params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");
  if (draft.status !== "candidate" && draft.status !== "researching") return jsonError(409, `No se investiga en estado "${draft.status}"`);

  const result = await research(draft.genus);
  const status = draft.status === "candidate" && canTransition("candidate", "researching") ? "researching" : draft.status;
  await env.DB.prepare("UPDATE species_drafts SET sources_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(result), status, draft.id)
    .run();
  await writeAudit(env.DB, data.admin.user.id, "draft.research", `draft:${draft.id}`, { sources: result.sources.map((s) => s.source) });
  return Response.json({ sources: result.sources, hasRealData: result.realData !== null });
};
