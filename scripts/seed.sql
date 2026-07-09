-- Ecorex seed data: Fractae, rarity tiers, active species and their curated
-- phase anchors. Source of truth for both local (--local) and remote
-- (--remote) D1. Uses INSERT OR IGNORE with explicit IDs so re-running this
-- file is always safe, whether the DB is empty or already partially seeded.
--
-- Every time a new species' art is finished and promoted to
-- public/species-art/{slug}/, add its rows here (and its Fractae if it's not
-- one of the 8 already listed), then run:
--   npm run db:seed          -- local
--   npm run db:seed:remote   -- production

INSERT OR IGNORE INTO fractae (id, slug, latin_name, child_name, icon, color, opposite_fractae_id) VALUES
  (1, 'furia', 'Ira', 'Furia', 'llama', 'rojo', NULL),
  (2, 'sorpresa', 'Stupor', 'Sorpresa', 'estrella', 'naranja', NULL),
  (3, 'tristeza', 'Tristitia', 'Tristeza', 'gota', 'azul', NULL),
  (4, 'miedo', 'Pavor', 'Miedo', 'ojo en sombra', 'morado', NULL),
  (5, 'asco', 'Fastidium', 'Asco', 'mancha', 'verde oscuro', NULL),
  (6, 'curiosidad', 'Spes', 'Curiosidad', 'lupa', 'lila', NULL);
  -- Pending: Alegría (Lumen), Confianza (Fides), Curiosidad (Spes) — add when
  -- their first species ships (docs/lore_world_bible_ecorex_v4.md §2).

INSERT OR IGNORE INTO rarity_tiers (id, slug, name, anchor_probability, drop_weight, sort_order) VALUES
  (1, 'registrada', 'Especie Común', 1, 0.55, 1),
  (2, 'notable', 'Especie Poco Común', 1, 0.27, 2),
  (3, 'singular', 'Especie Rara', 1, 0.12, 3),
  (4, 'epica', 'Especie Épica', 1, 0.05, 4),
  (5, 'primordial', 'Especie Legendaria', 1, 0.01, 5);

INSERT OR IGNORE INTO species (id, scientific_name, common_name, fractae_id, operation_id, physical_traits, base_palette, silhouette, launch_wave, is_active) VALUES
  (1, 'Tyrannosaurus imperator', 'Rex de Fuego', 1, NULL, NULL, NULL, NULL, 1, 1),
  (2, 'Telmatosaurus mirus', 'Destello del Pantano', 2, NULL, NULL, NULL, NULL, 1, 1),
  (3, 'Triceratops umbra', 'Tricera de las Lágrimas', 3, NULL, NULL, NULL, NULL, 1, 1),
  (4, 'Ceratosaurus pavonius', 'Colmillo del Abismo', 4, NULL, NULL, NULL, NULL, 1, 1),
  (5, 'Euoplocephalus nauseabundus', 'Coraza Pútrida', 5, NULL, NULL, NULL, NULL, 1, 1),
  (6, 'Huayangosaurus inquisitus', 'Hustor de Umbra', 6, NULL, NULL, NULL, NULL, 1, 1);

-- Placeholder species: not designed yet, is_active=0 keeps them out of the
-- discover/fuse pools (see functions/api/discover.ts, fuse/index.ts) but they
-- still occupy a Dex slot so each wave shows all 24 cards. Real art/lore
-- replaces a row here in place (same id) once the species is designed —
-- never renumber.
INSERT OR IGNORE INTO species (id, scientific_name, common_name, fractae_id, operation_id, physical_traits, base_palette, silhouette, launch_wave, is_active) VALUES
  (7, '???', '???', 1, NULL, NULL, NULL, NULL, 1, 0),
  (8, '???', '???', 2, NULL, NULL, NULL, NULL, 1, 0),
  (9, '???', '???', 3, NULL, NULL, NULL, NULL, 2, 0),
  (10, '???', '???', 4, NULL, NULL, NULL, NULL, 2, 0),
  (11, '???', '???', 5, NULL, NULL, NULL, NULL, 2, 0),
  (12, '???', '???', 6, NULL, NULL, NULL, NULL, 2, 0),
  (13, '???', '???', 1, NULL, NULL, NULL, NULL, 2, 0),
  (14, '???', '???', 2, NULL, NULL, NULL, NULL, 2, 0),
  (15, '???', '???', 3, NULL, NULL, NULL, NULL, 2, 0),
  (16, '???', '???', 4, NULL, NULL, NULL, NULL, 2, 0),
  (17, '???', '???', 5, NULL, NULL, NULL, NULL, 3, 0),
  (18, '???', '???', 6, NULL, NULL, NULL, NULL, 3, 0),
  (19, '???', '???', 1, NULL, NULL, NULL, NULL, 3, 0),
  (20, '???', '???', 2, NULL, NULL, NULL, NULL, 3, 0),
  (21, '???', '???', 3, NULL, NULL, NULL, NULL, 3, 0),
  (22, '???', '???', 4, NULL, NULL, NULL, NULL, 3, 0),
  (23, '???', '???', 5, NULL, NULL, NULL, NULL, 3, 0),
  (24, '???', '???', 6, NULL, NULL, NULL, NULL, 3, 0),
  (25, '???', '???', 1, NULL, NULL, NULL, NULL, 4, 0),
  (26, '???', '???', 2, NULL, NULL, NULL, NULL, 4, 0),
  (27, '???', '???', 3, NULL, NULL, NULL, NULL, 4, 0),
  (28, '???', '???', 4, NULL, NULL, NULL, NULL, 4, 0),
  (29, '???', '???', 5, NULL, NULL, NULL, NULL, 4, 0),
  (30, '???', '???', 6, NULL, NULL, NULL, NULL, 4, 0),
  (31, '???', '???', 1, NULL, NULL, NULL, NULL, 4, 0),
  (32, '???', '???', 2, NULL, NULL, NULL, NULL, 4, 0),
  (33, '???', '???', 3, NULL, NULL, NULL, NULL, 5, 0),
  (34, '???', '???', 4, NULL, NULL, NULL, NULL, 5, 0),
  (35, '???', '???', 5, NULL, NULL, NULL, NULL, 5, 0),
  (36, '???', '???', 6, NULL, NULL, NULL, NULL, 5, 0),
  (37, '???', '???', 1, NULL, NULL, NULL, NULL, 5, 0),
  (38, '???', '???', 2, NULL, NULL, NULL, NULL, 5, 0),
  (39, '???', '???', 3, NULL, NULL, NULL, NULL, 5, 0),
  (40, '???', '???', 4, NULL, NULL, NULL, NULL, 5, 0);

-- lore_phrase is per species+phase (not per species) so Balance/Exceso/Eco
-- read as three distinct emotional moments instead of the same card copy
-- with only the art swapped out. Exceso is the universal "intensified"
-- modifier (docs/lore_world_bible_ecorex_v5.md §15.3); Eco follows each
-- species' Fractae extreme-emotion archetype (same section) filtered through
-- that species' own imagery — never the same phrasing as another species,
-- even when they share a Fractae.
INSERT OR IGNORE INTO species_phase_anchors (id, species_id, phase, image_url, lore_phrase, approved_at) VALUES
  (2, 1, 'balance', '/species-art/tyrannosaurus-imperator/balance.webp', 'Donde pisa el Rex de Fuego, la tierra misma arde de una rabia que nunca se apaga.', NULL),
  (3, 1, 'exceso', '/species-art/tyrannosaurus-imperator/exceso.webp', 'Ya no camina: arrasa. Cada zancada del Rex de Fuego resquebraja el suelo, y las grietas que deja tras de sí siguen ardiendo mucho después de que se ha ido.', NULL),
  (4, 1, 'eco', '/species-art/tyrannosaurus-imperator/eco.webp', 'En su extremo, el Rex de Fuego ya no contiene su propia rabia: arde desde dentro hasta que su cuerpo, incapaz de sostener tanto fuego, comienza a fracturarse.', NULL),
  (5, 2, 'balance', '/species-art/telmatosaurus-mirus/balance.webp', 'Nadie ve venir al Destello del Pantano; solo el reflejo dorado en el agua delata que el asombro ya está sobre ti.', NULL),
  (6, 2, 'exceso', '/species-art/telmatosaurus-mirus/exceso.webp', 'El brillo del Destello del Pantano se vuelve tan intenso que ilumina la ciénaga entera, un segundo de asombro puro antes de que todo vuelva a la oscuridad.', NULL),
  (7, 2, 'eco', '/species-art/telmatosaurus-mirus/eco.webp', 'En su extremo, el Destello del Pantano queda atrapado en su propio asombro: congelado a mitad de un movimiento que nunca llegará a completarse.', NULL),
  (8, 3, 'balance', '/species-art/triceratops-umbra/balance.webp', 'Cada lágrima que cae de su gorguera es un recuerdo que el mundo se niega a soltar.', NULL),
  (9, 3, 'exceso', '/species-art/triceratops-umbra/exceso.webp', 'La gorguera de la Tricera de las Lágrimas ya no gotea: llora sin pausa, un duelo que se derrama sobre cada paso que da.', NULL),
  (10, 3, 'eco', '/species-art/triceratops-umbra/eco.webp', 'En su extremo, la Tricera de las Lágrimas se hunde en un duelo tan profundo que ya no puede sostenerse a sí misma: cede su forma entera a su propio dolor.', NULL),
  (11, 4, 'balance', '/species-art/ceratosaurus-pavonius/balance.webp', 'En las grietas más oscuras del Mundo Primario, donde ni la luz llega, el Colmillo del Abismo acecha: la encarnación viva del miedo que paraliza, del terror que hiela la sangre antes de que las fauces cierren.', NULL),
  (12, 4, 'exceso', '/species-art/ceratosaurus-pavonius/exceso.webp', 'El Colmillo del Abismo ya no espera en las sombras: caza el terror mismo, y cada presa que toca queda paralizada mucho antes de que sus fauces lleguen.', NULL),
  (13, 4, 'eco', '/species-art/ceratosaurus-pavonius/eco.webp', 'En su extremo, el Colmillo del Abismo es devorado por su propio pánico hasta la disolución total: el instante final antes de desaparecer, cediendo ante el vacío que él mismo encarna.', NULL),
  (14, 5, 'balance', '/species-art/euoplocephalus-nauseabundus/balance.webp', 'Donde el Asco se encarnó, ni la piedra escapa a la corrupción: el Euoplocephalus nauseabundus purifica por descomposición, convirtiendo la fortaleza en fastidio.', NULL),
  (15, 5, 'exceso', '/species-art/euoplocephalus-nauseabundus/exceso.webp', 'La Coraza Pútrida ya no se limita a corromper lo que toca: su propio caparazón se pudre a la vista, y aun así avanza, indiferente a su propia ruina.', NULL),
  (16, 5, 'eco', '/species-art/euoplocephalus-nauseabundus/eco.webp', 'En su extremo, la Coraza Pútrida es corroída por su propio rechazo: se descompone en tiempo real, consumida por aquello que ella misma repudia.', NULL),
  (17, 6, 'balance', '/species-art/huayangosaurus-inquisitus/balance.webp', 'En los confines del olvido, donde la verdad aguarda sin ser nombrada, el Hustor camina—sus cristales lila cantan preguntas que las piedras nunca responderán.', NULL),
  (18, 6, 'exceso', '/species-art/huayangosaurus-inquisitus/exceso.webp', 'Los cristales del Hustor de Umbra brillan con una intensidad casi dolorosa, cada pregunta sin respuesta alimentando un hambre de saber que ya no puede saciar.', NULL),
  (19, 6, 'eco', '/species-art/huayangosaurus-inquisitus/eco.webp', 'En su extremo, el Hustor de Umbra es disuelto por su propia obsesión de comprender: fragmentado en incontables piezas que siguen buscando respuestas por separado.', NULL);
