-- Release lifecycle redesign
--
-- 1. Add 'ended' to release_type CHECK (movies that left theaters without an OTT deal)
-- 2. Add available_from to movie_platforms (null = streaming now; set = coming on that date)
-- 3. Add original_language to movies ('te', 'hi', 'ta', etc.)
-- 4. Add movie_theatrical_runs for re-release tracking

-- 1. Extend release_type CHECK constraint
ALTER TABLE movies DROP CONSTRAINT movies_release_type_check;
ALTER TABLE movies ADD CONSTRAINT movies_release_type_check
  CHECK (release_type IN ('theatrical', 'ott', 'upcoming', 'ended'));

-- 2. Add available_from to movie_platforms
ALTER TABLE movie_platforms ADD COLUMN available_from date;

-- 3. Add original_language to movies
ALTER TABLE movies ADD COLUMN original_language text;

-- 4. Track all theatrical runs per movie (original + re-releases)
--    movies.release_date = original release date (immutable, from TMDB)
--    movie_theatrical_runs = all distinct theatrical windows
CREATE TABLE movie_theatrical_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id     uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  release_date date NOT NULL,
  label        text,           -- null = original; 'Re-release', 'Director''s Cut', etc.
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_movie_theatrical_runs_movie_id
  ON movie_theatrical_runs(movie_id);

CREATE INDEX idx_movie_theatrical_runs_release_date
  ON movie_theatrical_runs(release_date);

-- RLS: public read; authenticated write (same pattern as other tables)
ALTER TABLE movie_theatrical_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read theatrical runs"
  ON movie_theatrical_runs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage theatrical runs"
  ON movie_theatrical_runs FOR ALL
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
