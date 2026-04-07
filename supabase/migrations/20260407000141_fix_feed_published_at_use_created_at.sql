-- Fix: feed posts all getting the same published_at (midnight) because the trigger
-- used COALESCE(poster_date, created_at, now()). poster_date is a DATE (no time),
-- so every image added on the same day got published_at = midnight. The feed sorts
-- by published_at DESC, making same-day posts appear in arbitrary order.
--
-- Fix: use created_at first (has real timestamp), fall back to poster_date only
-- when created_at is null.

-- ============================================================
-- 1. Fix the image sync trigger
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
    -- Use created_at (has real timestamp) first; poster_date is date-only (no time)
    COALESCE(NEW.created_at, NEW.poster_date, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    feed_type     = EXCLUDED.feed_type,
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    -- Use created_at first so we preserve the actual timestamp
    published_at  = COALESCE(EXCLUDED.published_at, public.news_feed.published_at, now());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Fix today's posts: set published_at = created_at
-- ============================================================
UPDATE public.news_feed
SET    published_at = created_at
WHERE  published_at = '2026-04-07T00:00:00+00:00'
  AND  created_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
