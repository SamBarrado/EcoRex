-- Ecorex D1 schema
-- Domain reference: docs/lore_world_bible_ecorex_v3.md

-- 1. Fractae: the 8 emotional cores
CREATE TABLE fractae (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,          -- e.g. 'furia'
  latin_name TEXT NOT NULL,           -- e.g. 'Ira'
  child_name TEXT NOT NULL,           -- e.g. 'Furia'
  icon TEXT,
  color TEXT,
  opposite_fractae_id INTEGER REFERENCES fractae(id)
);

-- 2. Operations: monthly themed expeditions
CREATE TABLE operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,          -- e.g. 'ignea'
  name TEXT NOT NULL,
  dominant_fractae_id INTEGER REFERENCES fractae(id),
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 0
);

-- 3. Base species: the fixed bestiary catalog (Pokedex level)
CREATE TABLE species (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scientific_name TEXT NOT NULL,      -- e.g. 'Tyrannosaurus imperator'
  common_name TEXT NOT NULL,          -- e.g. 'Rex de Fuego'
  fractae_id INTEGER NOT NULL REFERENCES fractae(id),
  operation_id INTEGER REFERENCES operations(id),  -- operation that introduced it
  physical_traits TEXT,               -- spec sheet notes (fixed traits)
  base_palette TEXT,
  silhouette TEXT,
  launch_wave INTEGER NOT NULL DEFAULT 1,  -- monthly wave the species released in
  is_active INTEGER NOT NULL DEFAULT 0     -- gated until curated art is ready
);

-- 4. Species anchor images: curated canonical image per species+phase
CREATE TABLE species_phase_anchors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL REFERENCES species(id),
  phase TEXT NOT NULL CHECK (phase IN ('balance', 'exceso', 'eco')),
  image_url TEXT NOT NULL,
  lore_phrase TEXT,                   -- flavor text shown on the card, specific to this phase
  approved_at TEXT,
  UNIQUE (species_id, phase)
);

-- 5. Rarity tiers (fixed reference table)
CREATE TABLE rarity_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,          -- e.g. 'epica'
  name TEXT NOT NULL,                 -- e.g. 'Especie Epica'
  anchor_probability REAL NOT NULL,   -- P(servir ancla curada | ya se sorteó este tier), e.g. 0.15
  drop_weight REAL NOT NULL,          -- P(que se sortee este tier en una captura) del modo base sin Operación activa
  sort_order INTEGER NOT NULL
);

-- 6. Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL DEFAULT '',  -- username/handle, required & unique (see idx_users_display_name)
  needs_username_setup INTEGER NOT NULL DEFAULT 0,  -- 1 for pre-migration users backfilled with a placeholder
  explorer_rank TEXT NOT NULL DEFAULT 'novato',
  xp INTEGER NOT NULL DEFAULT 0,
  energy_count INTEGER NOT NULL DEFAULT 2,  -- Percibir energy: 2 discoveries per 12h window
  energy_window_start INTEGER,  -- ms timestamp of first spend since full; NULL = full, no countdown
  unlimited_energy INTEGER NOT NULL DEFAULT 0,  -- bypass energy limit entirely; set manually for QA accounts
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_users_display_name ON users(display_name);

-- 7. Discoveries: user-owned card instances (Album level, duplicates included)
CREATE TABLE discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discovery_code TEXT NOT NULL UNIQUE,   -- e.g. 'DX-VOL-F7K'
  user_id INTEGER NOT NULL REFERENCES users(id),
  species_id INTEGER NOT NULL REFERENCES species(id),
  phase TEXT NOT NULL CHECK (phase IN ('balance', 'exceso', 'eco')),
  rarity_tier_id INTEGER NOT NULL REFERENCES rarity_tiers(id),
  operation_id INTEGER REFERENCES operations(id),
  image_url TEXT NOT NULL,               -- anchor image or unique generated variant
  is_unique_variant INTEGER NOT NULL DEFAULT 0,
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  consumed_at TEXT
);

-- 8. Gifts: unidirectional trading of a specific discovery
CREATE TABLE gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discovery_id INTEGER NOT NULL REFERENCES discoveries(id),
  gift_code TEXT NOT NULL UNIQUE,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  redeemed_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  redeemed_at TEXT
);

-- 9. Resonance cards: 8 ultra-rare cards, one per Fractae, no species attached
CREATE TABLE resonance_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fractae_id INTEGER NOT NULL UNIQUE REFERENCES fractae(id),
  image_url TEXT,
  lore_text TEXT
);

CREATE TABLE user_resonance_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  resonance_card_id INTEGER NOT NULL REFERENCES resonance_cards(id),
  obtained_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, resonance_card_id)
);

-- 10. Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER,
  expires_at INTEGER
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- 11. Notifications: generic in-app event inbox
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,          -- e.g. 'fusion_ready'; payload shape depends on type
  payload TEXT,                -- JSON, e.g. { "speciesId": 12, "commonName": "Rex de Fuego" }
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

-- Indexes for common lookups
CREATE INDEX idx_discoveries_user ON discoveries(user_id);
CREATE INDEX idx_discoveries_species ON discoveries(species_id);
CREATE INDEX idx_species_operation ON species(operation_id);
CREATE INDEX idx_gifts_discovery ON gifts(discovery_id);

-- 12. Daily missions: per-user, per-day progress toward the 3 fixed daily
-- missions plus the "all 3 completed" bonus. Targets and xp rewards live in
-- code (functions/lib/missions.ts), not here — only real progress is stored.
-- A day with no rows means "not started yet", so there's no reset job.
CREATE TABLE daily_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  mission_slug TEXT NOT NULL CHECK (mission_slug IN ('percibir', 'coleccionista', 'fusion', 'bonus')),
  day TEXT NOT NULL,              -- 'YYYY-MM-DD', UTC
  progress_count INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE (user_id, mission_slug, day)
);
CREATE INDEX idx_daily_missions_user_day ON daily_missions(user_id, day);

-- 13. Push subscriptions: Web Push endpoints registered per user/device
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE users ADD COLUMN energy_last_notified_count INTEGER NOT NULL DEFAULT 0;  -- highest energy_count value already pushed since last spend; lets the push-cron worker notify once per point gained, not just at max
