-- Fix streaming_url column: add IF NOT EXISTS guard
ALTER TABLE movie_platforms ADD COLUMN IF NOT EXISTS streaming_url text;

-- Fix privacy columns: add NOT NULL constraints
ALTER TABLE profiles ALTER COLUMN is_profile_public SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN is_watchlist_public SET NOT NULL;
