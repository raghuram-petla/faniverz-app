-- Fix: migrations 000141-000143 rewrote sync_movie_poster_to_feed() to fix
-- published_at ordering but accidentally removed the TMDB suppression guard
-- from migration 000138. This caused TMDB-imported posters and backdrops to
-- create news_feed entries, flooding the feed with auto-generated content.
--
-- Fix: restore the tmdb_file_path check so TMDB-synced images are skipped.
-- Also clean up any news_feed rows that were created by TMDB image imports.

-- ============================================================
-- 1. Restore tmdb_file_path guard in the image → feed trigger
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_poster_to_feed()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
  v_feed_type   text;
  v_content_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed
    WHERE source_table = 'movie_images' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Skip feed creation for TMDB-synced images
  IF NEW.tmdb_file_path IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- @contract: set feed/content type based on image_type
  IF NEW.image_type = 'backdrop' THEN
    v_feed_type    := 'backdrop';
    v_content_type := 'backdrop';
  ELSE
    v_feed_type    := 'poster';
    v_content_type := 'poster';
  END IF;

  SELECT title INTO v_movie_title FROM public.movies WHERE id = NEW.movie_id;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, thumbnail_url, published_at
  ) VALUES (
    v_feed_type, v_content_type,
    COALESCE(v_movie_title, '') || ' - ' || COALESCE(NEW.title, 'Image'),
    NEW.description, NEW.movie_id,
    'movie_images', NEW.id, NEW.image_url,
    -- @contract: published_at logic for feed ordering:
    --   poster_date is NULL or today → now() (new content, sort by insertion time)
    --   poster_date is in the past   → poster_date + time from created_at (keep old content historical)
    CASE
      WHEN NEW.poster_date IS NULL OR NEW.poster_date >= CURRENT_DATE
        THEN COALESCE(NEW.created_at, now())
      ELSE NEW.poster_date + COALESCE(NEW.created_at::time, '00:00:00'::time)
    END
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    feed_type     = EXCLUDED.feed_type,
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at  = COALESCE(EXCLUDED.published_at, public.news_feed.published_at, now());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Delete feed entries that were created by TMDB image imports
-- ============================================================
DELETE FROM public.news_feed
WHERE source_table = 'movie_images'
  AND source_id IN (
    SELECT id FROM public.movie_images WHERE tmdb_file_path IS NOT NULL
  );

NOTIFY pgrst, 'reload schema';
