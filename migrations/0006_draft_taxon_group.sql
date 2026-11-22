-- 0006_draft_taxon_group: which taxonomic group a draft belongs to.
--
-- ADDITIVE; apply to production before deploying Admin code that reads it.
-- Reversible: ALTER TABLE species_drafts DROP COLUMN taxon_group;
--
-- Species Discovery now searches more than Dinosauria (pterosaurs, marine reptiles,
-- crocodylomorphs). The key matches shared/species-sources/groups.mjs; it is validated
-- in code (adding a group must not need a migration), and 'dinosaurios' is the default
-- so every existing draft keeps meaning what it meant.
ALTER TABLE species_drafts ADD COLUMN taxon_group TEXT NOT NULL DEFAULT 'dinosaurios';
