import { denyUnlessRole, type AdminContext, type AdminEnv } from "../../lib/adminAuth";

/** Species Manager listing: every `species` row with its art status, plus the drafts waiting to be promoted. */
export const onRequestGet: PagesFunction<AdminEnv, any, { admin: AdminContext }> = async ({ env, data }) => {
  const denied = denyUnlessRole(data.admin, ["content_editor"]);
  if (denied) return denied;
  const [species, approved] = await Promise.all([
    env.DB.prepare(
      `SELECT s.id, s.scientific_name, s.common_name, s.launch_wave, s.is_active, f.child_name AS fractae,
              (SELECT GROUP_CONCAT(phase) FROM species_phase_anchors a WHERE a.species_id = s.id) AS phases,
              (SELECT d.id FROM species_drafts d WHERE d.species_id = s.id) AS draft_id
       FROM species s JOIN fractae f ON f.id = s.fractae_id
       ORDER BY s.id DESC`
    ).all(),
    env.DB.prepare(
      "SELECT id, genus, fractae, edition, updated_at, json_extract(spec_json, '$.commonName') AS common_name FROM species_drafts WHERE status = 'approved' ORDER BY updated_at DESC"
    ).all(),
  ]);
  const freeSlots = await env.DB.prepare(
    `SELECT launch_wave AS wave, COUNT(*) AS n FROM species
     WHERE scientific_name = '???' AND is_active = 0
       AND NOT EXISTS (SELECT 1 FROM species_phase_anchors a WHERE a.species_id = species.id)
     GROUP BY launch_wave ORDER BY launch_wave`
  ).all<{ wave: number; n: number }>();
  return Response.json({ species: species.results, approved: approved.results, freeSlots: freeSlots.results });
};
