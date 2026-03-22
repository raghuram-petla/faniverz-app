-- Add tmdb_provider_id to platforms table so we can match TMDB providers
-- without a hardcoded map. Allows auto-creation of platforms during sync.

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS tmdb_provider_id integer UNIQUE;

-- Backfill known mappings for existing platforms
UPDATE platforms SET tmdb_provider_id = 532 WHERE id = 'aha';
UPDATE platforms SET tmdb_provider_id = 8   WHERE id = 'netflix';
UPDATE platforms SET tmdb_provider_id = 119 WHERE id = 'prime';
UPDATE platforms SET tmdb_provider_id = 122 WHERE id = 'hotstar';
UPDATE platforms SET tmdb_provider_id = 237 WHERE id = 'zee5';
UPDATE platforms SET tmdb_provider_id = 309 WHERE id = 'sunnxt';
-- sonyliv and etvwin don't have known TMDB IDs
