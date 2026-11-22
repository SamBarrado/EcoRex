import type { AdminContext, AdminEnv } from "../../lib/adminAuth";

// Real numbers only (spec §19): nothing hard-coded.
export const onRequestGet: PagesFunction<AdminEnv, any, { admin: AdminContext }> = async ({ env }) => {
  const [species, anchors] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active FROM species").first<{ total: number; active: number }>(),
    env.DB.prepare("SELECT phase, COUNT(*) AS n FROM species_phase_anchors GROUP BY phase").all<{ phase: string; n: number }>(),
  ]);
  return Response.json({
    species: { total: species?.total ?? 0, active: species?.active ?? 0 },
    anchorsByPhase: Object.fromEntries((anchors.results ?? []).map((r) => [r.phase, r.n])),
  });
};
