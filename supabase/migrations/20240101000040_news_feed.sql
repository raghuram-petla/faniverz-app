-- News Feed: Materialized feed table with auto-population triggers
-- Aggregates movie_videos, movie_posters, and surprise_content into a single
-- chronological feed with admin-controlled priority and ordering.

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE news_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type text NOT NULL CHECK (feed_type IN ('video', 'poster', 'surprise', 'update')),
  content_type text NOT NULL,  -- granular: trailer, teaser, glimpse, song, poster, bts, short-film, update, etc.
  title text NOT NULL,
  description text,
  movie_id uuid REFERENCES movies(id) ON DELETE CASCADE,
  source_table text,           -- 'movie_videos' | 'movie_posters' | 'surprise_content' | null
  source_id uuid,              -- FK to original row (nullable for manual items)
  thumbnail_url text,
  youtube_id text,
  duration text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE news_feed ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_news_feed_published ON news_feed (published_at DESC);
CREATE INDEX idx_news_feed_pinned ON news_feed (is_pinned, display_order) WHERE is_pinned = true;
CREATE INDEX idx_news_feed_type ON news_feed (feed_type, published_at DESC);
CREATE UNIQUE INDEX idx_news_feed_source ON news_feed (source_table, source_id) WHERE source_table IS NOT NULL;
CREATE INDEX idx_news_feed_movie ON news_feed (movie_id) WHERE movie_id IS NOT NULL;

-- ============================================================
-- TRIGGER: movie_videos → news_feed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_video_to_feed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_movie_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM news_feed WHERE source_table = 'movie_videos' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT title INTO v_movie_title FROM movies WHERE id = NEW.movie_id;

  INSERT INTO news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, youtube_id, duration,
    thumbnail_url, published_at
  ) VALUES (
    'video', NEW.video_type,
    COALESCE(v_movie_title, '') || ' - ' || NEW.title,
    NEW.description, NEW.movie_id,
    'movie_videos', NEW.id, NEW.youtube_id, NEW.duration,
    'https://img.youtube.com/vi/' || NEW.youtube_id || '/hqdefault.jpg',
    COALESCE(NEW.video_date, NEW.created_at)
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    content_type = EXCLUDED.content_type,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    youtube_id = EXCLUDED.youtube_id,
    duration = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movie_video_feed
  AFTER INSERT OR UPDATE OR DELETE ON movie_videos
  FOR EACH ROW EXECUTE FUNCTION sync_movie_video_to_feed();

-- ============================================================
-- TRIGGER: movie_posters → news_feed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_poster_to_feed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_movie_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM news_feed WHERE source_table = 'movie_posters' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT title INTO v_movie_title FROM movies WHERE id = NEW.movie_id;

  INSERT INTO news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, thumbnail_url, published_at
  ) VALUES (
    'poster', 'poster',
    COALESCE(v_movie_title, '') || ' - ' || NEW.title,
    NEW.description, NEW.movie_id,
    'movie_posters', NEW.id, NEW.image_url,
    COALESCE(NEW.poster_date, NEW.created_at)
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movie_poster_feed
  AFTER INSERT OR UPDATE OR DELETE ON movie_posters
  FOR EACH ROW EXECUTE FUNCTION sync_movie_poster_to_feed();

-- ============================================================
-- TRIGGER: surprise_content → news_feed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_surprise_to_feed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM news_feed WHERE source_table = 'surprise_content' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO news_feed (
    feed_type, content_type, title, description,
    source_table, source_id, youtube_id, duration,
    thumbnail_url, published_at
  ) VALUES (
    'surprise', NEW.category, NEW.title, NEW.description,
    'surprise_content', NEW.id, NEW.youtube_id, NEW.duration,
    'https://img.youtube.com/vi/' || NEW.youtube_id || '/hqdefault.jpg',
    NEW.created_at
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    content_type = EXCLUDED.content_type,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    youtube_id = EXCLUDED.youtube_id,
    duration = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_surprise_feed
  AFTER INSERT OR UPDATE OR DELETE ON surprise_content
  FOR EACH ROW EXECUTE FUNCTION sync_surprise_to_feed();

-- ============================================================
-- BACKFILL: Populate from existing data
-- ============================================================
INSERT INTO news_feed (feed_type, content_type, title, description, movie_id, source_table, source_id, youtube_id, duration, thumbnail_url, published_at)
SELECT 'video', mv.video_type,
       COALESCE(m.title, '') || ' - ' || mv.title,
       mv.description, mv.movie_id,
       'movie_videos', mv.id, mv.youtube_id, mv.duration,
       'https://img.youtube.com/vi/' || mv.youtube_id || '/hqdefault.jpg',
       COALESCE(mv.video_date, mv.created_at)
FROM movie_videos mv
LEFT JOIN movies m ON m.id = mv.movie_id
ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL DO NOTHING;

INSERT INTO news_feed (feed_type, content_type, title, description, movie_id, source_table, source_id, thumbnail_url, published_at)
SELECT 'poster', 'poster',
       COALESCE(m.title, '') || ' - ' || mp.title,
       mp.description, mp.movie_id,
       'movie_posters', mp.id, mp.image_url,
       COALESCE(mp.poster_date, mp.created_at)
FROM movie_posters mp
LEFT JOIN movies m ON m.id = mp.movie_id
ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL DO NOTHING;

INSERT INTO news_feed (feed_type, content_type, title, description, source_table, source_id, youtube_id, duration, thumbnail_url, published_at)
SELECT 'surprise', sc.category, sc.title, sc.description,
       'surprise_content', sc.id, sc.youtube_id, sc.duration,
       'https://img.youtube.com/vi/' || sc.youtube_id || '/hqdefault.jpg',
       sc.created_at
FROM surprise_content sc
ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL DO NOTHING;

NOTIFY pgrst, 'reload schema';
