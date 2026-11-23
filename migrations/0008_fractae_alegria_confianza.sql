-- 0008_fractae_alegria_confianza: the two Fractae that had no row yet.
--
-- ADDITIVE for the schema; it also corrects two placeholder slots of wave 1.
-- Until now `fractae` held only 6 of the 8 canonical Fractae (World Bible v7 §4), so
-- Species Manager could not promote a sheet of Alegría or Confianza, and the wave-1
-- placeholder slots 7 and 8 used Furia and Sorpresa as stand-ins (fractae_id is NOT NULL).
-- Data is the one already in tools/species/sync-species-db.mjs (FRACTAE_META).
--
-- Only still-unused placeholders ('???', inactive) are touched. Nothing a player can see
-- changes: those slots are inactive and only appear as '???' in the Dex.
-- Reversible: UPDATE species SET fractae_id = 1 WHERE id = 7 (and 2 for id 8);
--             DELETE FROM fractae WHERE id IN (7, 8);
INSERT OR IGNORE INTO fractae (id, slug, latin_name, child_name, icon, color, opposite_fractae_id) VALUES
  (7, 'alegria', 'Lumen', 'Alegría', 'sol', 'amarillo', NULL),
  (8, 'confianza', 'Fides', 'Confianza', 'escudo', 'verde', NULL);

UPDATE species SET fractae_id = (SELECT id FROM fractae WHERE slug = 'alegria')
  WHERE id = 7 AND scientific_name = '???' AND is_active = 0;
UPDATE species SET fractae_id = (SELECT id FROM fractae WHERE slug = 'confianza')
  WHERE id = 8 AND scientific_name = '???' AND is_active = 0;
