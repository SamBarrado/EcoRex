-- 0007_draft_species_link: which `species` row a promoted draft became.
--
-- ADDITIVE; apply to production before deploying Admin code that reads it.
-- Reversible: ALTER TABLE species_drafts DROP COLUMN species_id;
--
-- Species Manager promotes an approved draft into `species` (always with
-- is_active = 0: the game never shows it until curated art exists) and keeps the
-- link here, so the promotion can be undone while the species is still inactive,
-- has no phase anchors and nobody has discovered it.
ALTER TABLE species_drafts ADD COLUMN species_id INTEGER REFERENCES species(id);
