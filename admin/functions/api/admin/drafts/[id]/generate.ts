import { assembleSpec, buildPrompt, callAnthropic, research, type ResearchResult } from "../../../../lib/discovery";
import { resolveFractae } from "../../../../../../shared/species-spec/prompt.mjs";
import { resolveGroup } from "../../../../../../shared/species-sources/groups.mjs";
import { addVersion, getDraft, parseId } from "../../../../lib/drafts";
import { denyUnlessRole, jsonError, writeAudit, type AdminContext, type AdminEnv } from "../../../../lib/adminAuth";

// Same model the CLI (generate-species-spec.mjs) already uses with this exact prompt.
// claude-haiku-5-5 exists (GET /v1/models, 2026-11-22) but returned no text block
// with this prompt in a first try, so it is opt-in via the SPEC_MODEL var until tested.
const DEFAULT_SPEC_MODEL = "claude-haiku-4-5";

/**
 * POST {confirm: true} — PAID Anthropic call. Refuses without explicit confirmation.
 * Uses the stored research when present (so the spec is grounded in what the
 * editor saw); otherwise researches first. Result is a draft version, never published.
 */
export const onRequestPost: PagesFunction<AdminEnv & { SPEC_MODEL?: string }, "id", { admin: AdminContext }> = async ({ request, params, env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const id = parseId(params.id);
  const draft = id && (await getDraft(env.DB, id));
  if (!draft) return jsonError(404, "Borrador no encontrado");

  const body = (await request.json().catch(() => ({}))) as { confirm?: boolean };
  if (body.confirm !== true) return jsonError(400, "Esta operación factura a Anthropic: envía confirm:true");
  if (!env.ANTHROPIC_API_KEY) return jsonError(503, "Falta el secreto ANTHROPIC_API_KEY en el servidor");

  if (draft.status === "candidate") await env.DB.prepare("UPDATE species_drafts SET status='researching' WHERE id=?").bind(draft.id).run();
  else if (draft.status !== "researching" && draft.status !== "needs_revision") return jsonError(409, `No se genera en estado "${draft.status}"`);

  const researched: ResearchResult = draft.sources_json ? JSON.parse(draft.sources_json) : await research(draft.genus);
  if (!draft.sources_json) {
    await env.DB.prepare("UPDATE species_drafts SET sources_json=? WHERE id=?").bind(JSON.stringify(researched), draft.id).run();
  }

  const model = env.SPEC_MODEL || DEFAULT_SPEC_MODEL;
  let result;
  try {
    result = await callAnthropic(buildPrompt(draft.genus, resolveFractae(draft.fractae), researched.realData, resolveGroup(draft.taxon_group)), env.ANTHROPIC_API_KEY, model);
  } catch (e) {
    await writeAudit(env.DB, data.admin.user.id, "draft.generate.failed", `draft:${draft.id}`, { model, error: e instanceof Error ? e.message : "unknown" });
    return jsonError(502, "La generación falló; no se ha guardado nada");
  }

  const spec = assembleSpec(result.fields, draft.fractae, draft.edition, {
    sources: researched.sources,
    generatedBy: { model, at: new Date().toISOString() },
  });
  await addVersion(env.DB, draft.id, spec, "ai", data.admin.user.id, "Generada con grounding de fuentes reales");
  // candidate/researching/needs_revision all lead to spec_draft (valid transitions).
  const to = "spec_draft";
  await env.DB.prepare("UPDATE species_drafts SET status=? WHERE id=?").bind(to, draft.id).run();
  await writeAudit(env.DB, data.admin.user.id, "draft.generate", `draft:${draft.id}`, { model, usage: result.usage });
  return Response.json({ ok: true, status: to, usage: result.usage ?? null });
};
