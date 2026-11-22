import { approvalBlockers, canTransition, type DraftStatus } from "../../../../lib/discovery";
import { getDraft, parseId } from "../../../../lib/drafts";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../../lib/adminAuth";

const SETTABLE: DraftStatus[] = ["candidate", "researching", "spec_draft", "needs_revision", "approved", "rejected"];

/** POST {to} — editorial transition. Approval requires a complete, valid sheet. */
export const onRequestPost: PagesFunction<AdminEnv, "id", { admin: AdminContext }> = async ({ request, params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");

  const body = (await request.json().catch(() => ({}))) as { to?: DraftStatus };
  const to = body.to;
  if (!to || !SETTABLE.includes(to)) return jsonError(400, "Estado no válido");
  if (!canTransition(draft.status, to)) return jsonError(409, `No se puede pasar de "${draft.status}" a "${to}"`);

  if (to === "spec_draft" && !draft.spec_json) return jsonError(409, "No hay ficha todavía");
  if (to === "approved") {
    const blockers = approvalBlockers(draft.spec_json ? JSON.parse(draft.spec_json) : null);
    if (blockers.length) return Response.json({ error: "La ficha no está lista para aprobar", blockers }, { status: 422 });
  }

  await env.DB.prepare("UPDATE species_drafts SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(to, draft.id).run();
  await writeAudit(env.DB, data.admin.user.id, `draft.${to}`, `draft:${draft.id}`, { from: draft.status });
  return Response.json({ ok: true, status: to });
};
