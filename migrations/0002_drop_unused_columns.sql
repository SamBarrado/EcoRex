-- 0002_drop_unused_columns: remove three columns nothing reads or writes any more.
--
-- * species.lore_phrase: legacy species-level lore. Lore now lives per phase in
--   species_phase_anchors.lore_phrase (since 88ee1e2). Its last values, kept here
--   for the record (all superseded):
--   species 1 (Rex de Fuego): Donde pisa el Rex de Fuego, la tierra misma arde de una rabia que nunca se apaga.
--   species 2 (Destello del Pantano): Nadie ve venir al Destello del Pantano; solo el reflejo dorado en el agua delata que el asombro ya está sobre ti.
--   species 3 (Tricera de las Lágrimas): Cada lágrima que cae de su gorguera es un recuerdo que el mundo se niega a soltar.
--   species 4 (Colmillo del Abismo): En las grietas más oscuras del Mundo Primario, donde ni la luz llega, el Colmillo del Abismo acecha: la encarnación viva del miedo que paraliza, del terror que hiela la sangre antes de que las fauces cierren.
--   species 5 (Coraza Pútrida): Donde el Asco se encarnó, ni la piedra escapa a la corrupción: el Euoplocephalus nauseabundus purifica por descomposición, convirtiendo la fortaleza en festidio.
--   species 6 (Hustor de Umbra): En los confines del olvido, donde la verdad aguarda sin ser nombrada, el Hustor camina—sus cristales lila cantan preguntas que las piedras nunca responderán.
-- * discoveries.is_unique_variant: always 0. The unique-variant generation
--   mechanic was removed from the code (9fafec6) and nothing reads or writes it.
-- * rarity_tiers.anchor_probability: always 1.0 (same mechanic). The code stopped
--   selecting it in the commit that introduced this migration.
--
-- ORDER WITH THE DEPLOY: apply this to production only AFTER the code that no longer
-- selects anchor_probability is deployed (otherwise the old code fails with
-- "no such column"). None of the three columns has an index, constraint or FK, so
-- DROP COLUMN is allowed. Irreversible: the data of these columns is gone.

ALTER TABLE species DROP COLUMN lore_phrase;
ALTER TABLE discoveries DROP COLUMN is_unique_variant;
ALTER TABLE rarity_tiers DROP COLUMN anchor_probability;
