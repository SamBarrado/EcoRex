-- Makes display_name (username) required & unique.
-- D1 can't reliably disable FK checks to rebuild the `users` table (sessions/discoveries/etc.
-- reference it), so uniqueness is enforced via a UNIQUE INDEX instead of a column constraint.

ALTER TABLE users ADD COLUMN needs_username_setup INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET display_name = 'user_' || id,
    needs_username_setup = 1
WHERE display_name = '' OR display_name IS NULL;

CREATE UNIQUE INDEX idx_users_display_name ON users(display_name);
