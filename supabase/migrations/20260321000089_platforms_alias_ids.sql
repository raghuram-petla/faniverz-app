-- Add tmdb_alias_ids to platforms for provider deduplication.
-- e.g. "Amazon Prime Video with Ads" maps to same platform as "Amazon Prime Video".

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS tmdb_alias_ids integer[] DEFAULT '{}';
