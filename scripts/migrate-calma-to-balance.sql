-- One-off migration: rename the phase value 'calma' -> 'balance' everywhere,
-- and rebuild species_phase_anchors/discoveries with the updated CHECK
-- constraint (phase IN ('balance','exceso','eco')) since SQLite can't ALTER
-- an existing CHECK constraint in place. Safe to run once against a DB that
-- still has the old constraint; running it again will fail at CREATE TABLE
-- because the target tables already exist — this file is meant to be run
-- exactly once per DB (mirrors scripts/migrate-furia-to-exceso.sql).

PRAGMA foreign_keys=OFF;

-- species_phase_anchors -----------------------------------------------------
CREATE TABLE species_phase_anchors_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL REFERENCES species(id),
  phase TEXT NOT NULL CHECK (phase IN ('balance', 'exceso', 'eco')),
  image_url TEXT NOT NULL,
  approved_at TEXT,
  UNIQUE (species_id, phase)
);

INSERT INTO species_phase_anchors_new (id, species_id, phase, image_url, approved_at)
SELECT
  id,
  species_id,
  CASE phase WHEN 'calma' THEN 'balance' ELSE phase END,
  REPLACE(image_url, '/calma.png', '/balance.png'),
  approved_at
FROM species_phase_anchors;

DROP TABLE species_phase_anchors;
ALTER TABLE species_phase_anchors_new RENAME TO species_phase_anchors;

-- discoveries -----------------------------------------------------------
CREATE TABLE discoveries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discovery_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  species_id INTEGER NOT NULL REFERENCES species(id),
  phase TEXT NOT NULL CHECK (phase IN ('balance', 'exceso', 'eco')),
  rarity_tier_id INTEGER NOT NULL REFERENCES rarity_tiers(id),
  operation_id INTEGER REFERENCES operations(id),
  image_url TEXT NOT NULL,
  is_unique_variant INTEGER NOT NULL DEFAULT 0,
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  consumed_at TEXT
);

INSERT INTO discoveries_new (id, discovery_code, user_id, species_id, phase, rarity_tier_id, operation_id, image_url, is_unique_variant, discovered_at, consumed_at)
SELECT
  id,
  discovery_code,
  user_id,
  species_id,
  CASE phase WHEN 'calma' THEN 'balance' ELSE phase END,
  rarity_tier_id,
  operation_id,
  REPLACE(image_url, '/calma.png', '/balance.png'),
  is_unique_variant,
  discovered_at,
  consumed_at
FROM discoveries;

DROP TABLE discoveries;
ALTER TABLE discoveries_new RENAME TO discoveries;

CREATE INDEX idx_discoveries_user ON discoveries(user_id);
CREATE INDEX idx_discoveries_species ON discoveries(species_id);

PRAGMA foreign_keys=ON;
