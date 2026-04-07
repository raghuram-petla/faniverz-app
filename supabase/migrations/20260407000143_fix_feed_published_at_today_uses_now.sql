-- Fix: when poster_date = today (CURRENT_DATE), the image was just added — use
-- now() for full timestamp precision so same-day posts sort by insertion time.
-- Only use poster_date (historical date + created_at time) for older images.

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
-- 2. Fix today's posts back to created_at (since poster_date = today)
-- ============================================================
UPDATE public.news_feed
SET    published_at = created_at
WHERE  source_table = 'movie_images'
  AND  published_at::date = CURRENT_DATE
  AND  created_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
