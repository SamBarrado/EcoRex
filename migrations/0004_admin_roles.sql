-- 0004_admin_roles: roles for Ecorex Admin + an audit log.
--
-- ADDITIVE: apply to production BEFORE deploying code that reads these.
-- Reversible: ALTER TABLE users DROP COLUMN role; DROP TABLE admin_audit_log;
--
-- users.role: 'player' (default, every existing and future public account),
-- 'admin', 'art_editor' or 'content_editor'. Nobody is promoted through the API:
-- the first admin is set by hand (see CLAUDE.md, "Ecorex Admin").
-- The CHECK makes an unknown role impossible to store.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'player'
  CHECK (role IN ('player', 'admin', 'art_editor', 'content_editor'));

-- Append-only record of sensitive admin actions (login, approvals, publishing...).
-- user_id is deliberately not an FK to keep the log if an account is ever removed.
CREATE TABLE admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,        -- e.g. 'admin.login', 'spec.approve'
  target TEXT,                 -- e.g. 'species:tyrannosaurus-imperator'
  detail TEXT,                 -- JSON, never secrets
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at);
