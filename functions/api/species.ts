interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT species.id as id, species.scientific_name as scientific_name,
            species.common_name as common_name, fractae.child_name as fractae_child_name
     FROM species
     JOIN fractae ON fractae.id = species.fractae_id
     WHERE species.is_active = 1
     ORDER BY species.id`
  ).all();

  return Response.json({ species: results });
};
