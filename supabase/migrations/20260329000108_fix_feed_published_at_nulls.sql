-- Fix null published_at in news_feed
--
-- Root cause: the three sync triggers used COALESCE(source_date, created_at) with
-- no final fallback. If both columns are null the INSERT/UPDATE silently writes NULL,
-- which formatRelativeTime() treats as "just now" and the feed sorts the item to the
-- very top as though it was published this instant.
--
-- Three-part fix:
--   1. Backfill — repair every existing null row
--   2. Constraint — harden the NOT NULL + add an explicit CHECK so no future path
--                   can ever store a null published_at
--   3. Triggers  — add now() as the final COALESCE fallback in all three sync
--                  functions, and protect the ON CONFLICT DO UPDATE paths so a
--                  null incoming value never overwrites a good existing timestamp

-- ============================================================
-- 1. BACKFILL
-- Prefer created_at (closest to actual publish time); fall back
-- to now() only when created_at is also null (shouldn't happen in
-- practice but covers completely orphaned rows).
-- ============================================================
UPDATE news_feed
SET    published_at = COALESCE(created_at, now())
WHERE  published_at IS NULL;

-- ============================================================
-- 2. CONSTRAINT
-- Ensure NOT NULL is set (it should be, but re-stating is safe
-- and makes intent explicit).  Add a CHECK as a belt-and-
-- suspenders guard that no future ALTER TABLE can accidentally
-- remove the NOT NULL without also removing the CHECK.
-- ============================================================
ALTER TABLE news_feed
  ALTER COLUMN published_at SET NOT NULL,
  ALTER COLUMN published_at SET DEFAULT now();

-- The CHECK is redundant with NOT NULL but makes the intent
-- explicit in pg_constraints and catches edge cases like
-- explicit NULL casts that some ORMs emit.
ALTER TABLE news_feed
  DROP CONSTRAINT IF EXISTS chk_news_feed_published_at_not_null;
ALTER TABLE news_feed
  ADD  CONSTRAINT chk_news_feed_published_at_not_null
       CHECK (published_at IS NOT NULL);

-- ============================================================
-- 3a. TRIGGER: movie_videos → news_feed (null-safe)
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
    -- now() is the final fallback so published_at is NEVER null
    COALESCE(NEW.video_date, NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    content_type = EXCLUDED.content_type,
    title        = EXCLUDED.title,
    description  = EXCLUDED.description,
    youtube_id   = EXCLUDED.youtube_id,
    duration     = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url,
    -- Only overwrite published_at when the incoming value is non-null.
    -- This prevents an admin editing metadata (without touching the date)
    -- from accidentally nulling out the existing published_at.
    published_at = COALESCE(EXCLUDED.published_at, news_feed.published_at, now());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3b. TRIGGER: movie_posters → news_feed (null-safe)
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
    -- now() is the final fallback so published_at is NEVER null
    COALESCE(NEW.poster_date, NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    -- Only overwrite published_at when the incoming value is non-null.
    published_at  = COALESCE(EXCLUDED.published_at, news_feed.published_at, now());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3c. TRIGGER: surprise_content → news_feed (null-safe)
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
    -- now() is the final fallback so published_at is NEVER null
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    youtube_id    = EXCLUDED.youtube_id,
    duration      = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url;
    -- published_at intentionally NOT updated on surprise_content edits:
    -- the original insert time is the canonical publish time.

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
