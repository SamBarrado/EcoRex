-- 0005_species_drafts: working catalog for Species Discovery (Ecorex Admin).
--
-- ADDITIVE, and independent of the game's tables: it does NOT touch `species`
-- (no second catalog: a draft only becomes a `species` row when it is promoted,
-- a later, explicit step). Apply to production before deploying Admin code.
-- Reversible: DROP TABLE spec_versions; DROP TABLE species_drafts;
--
-- status flow (spec §5): candidate -> researching -> spec_draft <-> needs_revision
-- -> approved -> (promoted, set by the future Species Manager) ; rejected anywhere.
CREATE TABLE species_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  genus TEXT NOT NULL,                  -- PBDB genus the candidate came from
  fractae TEXT NOT NULL,                -- canonical Fractae name, e.g. 'Furia'
  edition TEXT NOT NULL DEFAULT '',     -- wave / special edition; '' = none
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','researching','spec_draft','needs_revision','approved','rejected','promoted')),
  spec_json TEXT,                       -- current ficha-spec (NULL until generated/uploaded)
  sources_json TEXT,                    -- raw answers of PBDB / NHM / dinosaurpictures + consult date
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (genus, fractae, edition)      -- a genus may be reused for another Fractae/edition
);
CREATE INDEX idx_species_drafts_status ON species_drafts(status);

-- Every change to a draft's spec is a new row; nothing is edited in place.
CREATE TABLE spec_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id INTEGER NOT NULL REFERENCES species_drafts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  spec_json TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('ai', 'human')),
  note TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (draft_id, version)
);
