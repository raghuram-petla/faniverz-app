-- Fix regression in sync_movie_poster_to_feed introduced by 20260329000108.
--
-- That migration replaced the correct backdrop-aware trigger (from 20260327000104)
-- with an old version that had three bugs:
--   1. No backdrop handling — hardcoded feed_type='poster' and skipped backdrop logic
--   2. Bare NEW.title without COALESCE — NULL for backdrops, causing NULL title in
--      news_feed which violates NOT NULL and rolls back the movie_images INSERT
--   3. Wrong source_table — 'movie_posters' instead of 'movie_images'
--
-- This migration restores the correct version, plus keeps the now() fallback
-- for published_at that 20260329000108 introduced.

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
    -- @edge: NEW.title is NULL for backdrops — COALESCE prevents NULL propagation
    --        through PostgreSQL's text || NULL = NULL rule
    COALESCE(v_movie_title, '') || ' - ' || COALESCE(NEW.title, 'Image'),
    NEW.description, NEW.movie_id,
    'movie_images', NEW.id, NEW.image_url,
    -- now() is the final fallback so published_at is NEVER null
    COALESCE(NEW.poster_date, NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    feed_type     = EXCLUDED.feed_type,
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    -- Only overwrite published_at when the incoming value is non-null
    published_at  = COALESCE(EXCLUDED.published_at, public.news_feed.published_at, now());

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
