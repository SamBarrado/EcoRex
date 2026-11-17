-- Migration number: 0003 	 2026-11-17
-- "Sign in with Google": Google's stable user id (the OIDC `sub` claim).
-- SQLite can't ADD COLUMN ... UNIQUE, so the uniqueness goes in an index.
-- NULL = account not linked to Google (many NULLs are allowed in a unique index).
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX idx_users_google_sub ON users(google_sub);
