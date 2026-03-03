-- Movie posters and videos tables for rich media content.
-- Replaces single poster_url/trailer_url with multi-entry models.

-- ============================================================
-- MOVIE_POSTERS
-- ============================================================
CREATE TABLE movie_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  image_url text NOT NULL,
  title text NOT NULL,
  description text,
  poster_date date,
  is_main boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_movie_posters_movie_id ON movie_posters (movie_id);

-- Enforce at most one main poster per movie
CREATE UNIQUE INDEX idx_movie_posters_one_main
  ON movie_posters (movie_id) WHERE is_main = true;

-- RLS: public read, admin write
ALTER TABLE movie_posters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie posters are viewable by everyone"
  ON movie_posters FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movie_posters"
  ON movie_posters FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update movie_posters"
  ON movie_posters FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete movie_posters"
  ON movie_posters FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- MOVIE_VIDEOS
-- ============================================================
CREATE TABLE movie_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  youtube_id text NOT NULL,
  title text NOT NULL,
  description text,
  video_type text NOT NULL CHECK (video_type IN (
    'teaser', 'trailer', 'glimpse', 'song', 'interview',
    'bts', 'event', 'promo', 'making', 'other'
  )),
  video_date date,
  duration text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_movie_videos_movie_id ON movie_videos (movie_id);
CREATE INDEX idx_movie_videos_type ON movie_videos (movie_id, video_type);

-- RLS: public read, admin write
ALTER TABLE movie_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie videos are viewable by everyone"
  ON movie_videos FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movie_videos"
  ON movie_videos FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update movie_videos"
  ON movie_videos FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete movie_videos"
  ON movie_videos FOR DELETE
  USING (public.is_admin());
