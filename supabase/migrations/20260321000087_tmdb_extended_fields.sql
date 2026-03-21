-- TMDB Full Sync: add missing fields from TMDB API to movies, actors, production_houses

-- ── Movies table ────────────────────────────────────────────────────────────
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_status text;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_vote_average numeric;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_vote_count integer;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS budget bigint;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS revenue bigint;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_popularity numeric;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS spoken_languages text[];
ALTER TABLE movies ADD COLUMN IF NOT EXISTS collection_id integer;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS collection_name text;

-- ── Actors table ────────────────────────────────────────────────────────────
ALTER TABLE actors ADD COLUMN IF NOT EXISTS imdb_id text;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS known_for_department text;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS also_known_as text[];
ALTER TABLE actors ADD COLUMN IF NOT EXISTS death_date date;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS instagram_id text;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS twitter_id text;

-- ── Production houses — TMDB company ID for auto-linking ────────────────────
ALTER TABLE production_houses ADD COLUMN IF NOT EXISTS tmdb_company_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_houses_tmdb_company_id
  ON production_houses (tmdb_company_id) WHERE tmdb_company_id IS NOT NULL;
