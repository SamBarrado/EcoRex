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
  (5, 'asco', 'Fastidium', 'Asco', 'mancha', 'verde oscuro', NULL);
  -- Pending: Alegría (Lumen), Confianza (Fides), Curiosidad (Spes) — add when
  -- their first species ships (docs/lore_world_bible_ecorex_v4.md §2).

INSERT OR IGNORE INTO rarity_tiers (id, slug, name, anchor_probability, drop_weight, sort_order) VALUES
  (1, 'registrada', 'Especie Registrada', 1, 0.55, 1),
  (2, 'notable', 'Especie Notable', 1, 0.27, 2),
  (3, 'singular', 'Especie Singular', 1, 0.12, 3),
  (4, 'epica', 'Especie Épica', 1, 0.05, 4),
  (5, 'primordial', 'Especie Primordial', 1, 0.01, 5);

INSERT OR IGNORE INTO species (id, scientific_name, common_name, fractae_id, operation_id, physical_traits, base_palette, silhouette, launch_wave, is_active) VALUES
  (1, 'Tyrannosaurus imperator', 'Rex de Fuego', 1, NULL, NULL, NULL, NULL, 1, 1),
  (2, 'Telmatosaurus mirus', 'Destello del Pantano', 2, NULL, NULL, NULL, NULL, 1, 1),
  (3, 'Triceratops umbra', 'Tricera de las Lágrimas', 3, NULL, NULL, NULL, NULL, 1, 1),
  (4, 'Ceratosaurus pavonius', 'Colmillo del Abismo', 4, NULL, NULL, NULL, NULL, 1, 1),
  (5, 'Euoplocephalus nauseabundus', 'Coraza Pútrida', 5, NULL, NULL, NULL, NULL, 1, 1);

INSERT OR IGNORE INTO species_phase_anchors (id, species_id, phase, image_url, approved_at) VALUES
  (2, 1, 'calma', '/species-art/tyrannosaurus-imperator/calma.png', NULL),
  (3, 1, 'furia', '/species-art/tyrannosaurus-imperator/furia.png', NULL),
  (4, 1, 'eco', '/species-art/tyrannosaurus-imperator/eco.png', NULL),
  (5, 2, 'calma', '/species-art/telmatosaurus-mirus/calma.png', NULL),
  (6, 2, 'furia', '/species-art/telmatosaurus-mirus/furia.png', NULL),
  (7, 2, 'eco', '/species-art/telmatosaurus-mirus/eco.png', NULL),
  (8, 3, 'calma', '/species-art/triceratops-umbra/calma.png', NULL),
  (9, 3, 'furia', '/species-art/triceratops-umbra/furia.png', NULL),
  (10, 3, 'eco', '/species-art/triceratops-umbra/eco.png', NULL),
  (11, 4, 'calma', '/species-art/ceratosaurus-pavonius/calma.png', NULL),
  (12, 4, 'furia', '/species-art/ceratosaurus-pavonius/furia.png', NULL),
  (13, 4, 'eco', '/species-art/ceratosaurus-pavonius/eco.png', NULL),
  (14, 5, 'calma', '/species-art/euoplocephalus-nauseabundus/calma.png', NULL),
  (15, 5, 'furia', '/species-art/euoplocephalus-nauseabundus/furia.png', NULL),
  (16, 5, 'eco', '/species-art/euoplocephalus-nauseabundus/eco.png', NULL);
