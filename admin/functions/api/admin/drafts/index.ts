import { resolveFractae } from "../../../../../shared/species-spec/prompt.mjs";
import { resolveGroup } from "../../../../../shared/species-sources/groups.mjs";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../lib/adminAuth";

type Ctx = { admin: AdminContext };

export const onRequestGet: PagesFunction<AdminEnv, any, Ctx> = async ({ env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    "SELECT id, genus, fractae, edition, taxon_group, status, updated_at FROM species_drafts ORDER BY updated_at DESC, id DESC"
  ).all();
  return Response.json({ drafts: results });
};

/** POST {genus, fractae, edition?} — registers a candidate. No external calls, no cost. */
export const onRequestPost: PagesFunction<AdminEnv, any, Ctx> = async ({ request, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;

  let body: { genus?: string; fractae?: string; edition?: string; group?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "JSON no válido");
  }
  const genus = body.genus?.trim();
  if (!genus || !/^[A-Z][a-z]{1,39}$/.test(genus)) return jsonError(400, "Género no válido (ej. Stegosaurus)");
  let fractae;
  try {
    fractae = resolveFractae(body.fractae ?? "");
  } catch {
    return jsonError(400, "Fractae no reconocido");
  }
  const edition = (body.edition ?? "").trim().slice(0, 80);
  const group = resolveGroup(body.group);
  if (!group) return jsonError(400, "Grupo no válido");

  try {
    const r = await env.DB.prepare("INSERT INTO species_drafts (genus, fractae, edition, taxon_group, created_by) VALUES (?, ?, ?, ?, ?)")
      .bind(genus, fractae.name, edition, group.key, data.admin.user.id)
      .run();
    const id = r.meta.last_row_id;
    await writeAudit(env.DB, data.admin.user.id, "draft.create", `draft:${id}`, { genus, fractae: fractae.name, edition, group: group.key });
    return Response.json({ id }, { status: 201 });
  } catch {
    return jsonError(409, "Ya existe un borrador de este género con ese Fractae y edición");
  }
};
