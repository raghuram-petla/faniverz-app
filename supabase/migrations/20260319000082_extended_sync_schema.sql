-- Extended sync schema: backdrops table, poster metadata, video dedup,
-- movies columns for IMDb/Telugu, and keywords table.

-- ============================================================
-- 1. MOVIE_BACKDROPS — multiple backdrops per movie
-- ============================================================
CREATE TABLE movie_backdrops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  image_url text NOT NULL,
  tmdb_file_path text,
  width integer,
  height integer,
  iso_639_1 text,
  vote_average numeric DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_movie_backdrops_movie ON movie_backdrops(movie_id);

ALTER TABLE movie_backdrops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie backdrops are viewable by everyone"
  ON movie_backdrops FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie_backdrops"
  ON movie_backdrops FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update movie_backdrops"
  ON movie_backdrops FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete movie_backdrops"
  ON movie_backdrops FOR DELETE USING (public.is_admin());

-- ============================================================
-- 2. MOVIE_POSTERS — add TMDB metadata columns
-- ============================================================
ALTER TABLE movie_posters ADD COLUMN IF NOT EXISTS tmdb_file_path text;
ALTER TABLE movie_posters ADD COLUMN IF NOT EXISTS iso_639_1 text;
ALTER TABLE movie_posters ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE movie_posters ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE movie_posters ADD COLUMN IF NOT EXISTS vote_average numeric DEFAULT 0;

-- ============================================================
-- 3. MOVIE_VIDEOS — unique constraint for dedup on re-sync
-- ============================================================
ALTER TABLE movie_videos ADD COLUMN IF NOT EXISTS tmdb_video_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_movie_videos_tmdb_key
  ON movie_videos (movie_id, tmdb_video_key) WHERE tmdb_video_key IS NOT NULL;

-- ============================================================
-- 4. MOVIES — IMDb ID, Telugu title/synopsis
-- ============================================================
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_id text;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS title_te text;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS synopsis_te text;

-- ============================================================
-- 5. MOVIE_KEYWORDS
-- ============================================================
CREATE TABLE movie_keywords (
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  keyword_id integer NOT NULL,
  keyword_name text NOT NULL,
  PRIMARY KEY (movie_id, keyword_id)
);

CREATE INDEX idx_movie_keywords_name ON movie_keywords(keyword_name);

ALTER TABLE movie_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie keywords are viewable by everyone"
  ON movie_keywords FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie_keywords"
  ON movie_keywords FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update movie_keywords"
  ON movie_keywords FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete movie_keywords"
  ON movie_keywords FOR DELETE USING (public.is_admin());
