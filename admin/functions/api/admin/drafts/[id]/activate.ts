import { getDraft, parseId } from "../../../../lib/drafts";
import { activateDraft, deactivateDraft, DEFAULT_PWA_ORIGIN } from "../../../../lib/promotion";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../../lib/adminAuth";

type Ctx = { admin: AdminContext };
type Env = AdminEnv & { PWA_ORIGIN?: string };

/** POST — makes a promoted species playable (needs the art published on the PWA). */
export const onRequestPost: PagesFunction<Env, "id", Ctx> = async ({ params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");
  const r = await activateDraft(env.DB, draft, env.PWA_ORIGIN ?? DEFAULT_PWA_ORIGIN);
  if (!r.ok) return jsonError(r.status, r.error);
  await writeAudit(env.DB, data.admin.user.id, "species.activate", `draft:${draft.id}`, { speciesId: draft.species_id });
  return Response.json({ ok: true });
};

/** DELETE — takes the species out of the game again, while no player holds a card of it. */
export const onRequestDelete: PagesFunction<Env, "id", Ctx> = async ({ params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");
  const r = await deactivateDraft(env.DB, draft);
  if (!r.ok) return jsonError(r.status, r.error);
  await writeAudit(env.DB, data.admin.user.id, "species.deactivate", `draft:${draft.id}`, { speciesId: draft.species_id });
  return Response.json({ ok: true });
};
