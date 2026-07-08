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

INSERT OR IGNORE INTO species_phase_anchors (id, species_id, phase, image_url, approved_at) VALUES
  (2, 1, 'balance', '/species-art/tyrannosaurus-imperator/balance.png', NULL),
  (3, 1, 'exceso', '/species-art/tyrannosaurus-imperator/exceso.png', NULL),
  (4, 1, 'eco', '/species-art/tyrannosaurus-imperator/eco.png', NULL),
  (5, 2, 'balance', '/species-art/telmatosaurus-mirus/balance.png', NULL),
  (6, 2, 'exceso', '/species-art/telmatosaurus-mirus/exceso.png', NULL),
  (7, 2, 'eco', '/species-art/telmatosaurus-mirus/eco.png', NULL),
  (8, 3, 'balance', '/species-art/triceratops-umbra/balance.png', NULL),
  (9, 3, 'exceso', '/species-art/triceratops-umbra/exceso.png', NULL),
  (10, 3, 'eco', '/species-art/triceratops-umbra/eco.png', NULL),
  (11, 4, 'balance', '/species-art/ceratosaurus-pavonius/balance.png', NULL),
  (12, 4, 'exceso', '/species-art/ceratosaurus-pavonius/exceso.png', NULL),
  (13, 4, 'eco', '/species-art/ceratosaurus-pavonius/eco.png', NULL),
  (14, 5, 'balance', '/species-art/euoplocephalus-nauseabundus/balance.png', NULL),
  (15, 5, 'exceso', '/species-art/euoplocephalus-nauseabundus/exceso.png', NULL),
  (16, 5, 'eco', '/species-art/euoplocephalus-nauseabundus/eco.png', NULL),
  (17, 6, 'balance', '/species-art/huayangosaurus-inquisitus/balance.png', NULL),
  (18, 6, 'exceso', '/species-art/huayangosaurus-inquisitus/exceso.png', NULL),
  (19, 6, 'eco', '/species-art/huayangosaurus-inquisitus/eco.png', NULL);
