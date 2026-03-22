-- Remove tmdb_alias_ids from platforms — not needed.
-- Each TMDB provider ID is treated as its own distinct platform.

ALTER TABLE platforms DROP COLUMN IF EXISTS tmdb_alias_ids;
