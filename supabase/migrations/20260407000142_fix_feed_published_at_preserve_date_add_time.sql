-- Fix: previous migration (000141) used created_at as published_at, which causes
-- old movie posters (e.g., from 2024) to appear at the top of today's feed.
--
-- Correct behavior: use poster_date to keep old content sorted historically,
-- but combine it with the TIME from created_at so same-day posts sort correctly.
--
-- poster_date exists  → poster_date + time-of-day from created_at
-- poster_date is NULL → created_at (full timestamp)
-- both NULL           → now()

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
    -- @edge: poster_date is DATE (no time). Combine with time from created_at
    -- so old posters stay in the past but same-day posts sort by insertion order.
    CASE
      WHEN NEW.poster_date IS NOT NULL AND NEW.created_at IS NOT NULL
        THEN NEW.poster_date + NEW.created_at::time
      WHEN NEW.created_at IS NOT NULL
        THEN NEW.created_at
      ELSE now()
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
-- 2. Fix today's posts: restore poster_date + time from created_at
--    (previous migration set them all to created_at, losing the date)
-- ============================================================
UPDATE public.news_feed nf
SET    published_at = mi.poster_date + mi.created_at::time
FROM   public.movie_images mi
WHERE  nf.source_table = 'movie_images'
  AND  nf.source_id = mi.id
  AND  mi.poster_date IS NOT NULL
  AND  mi.created_at IS NOT NULL
  AND  nf.published_at::date = nf.created_at::date  -- only fix rows touched by previous migration
  AND  mi.poster_date != nf.created_at::date;        -- only where poster_date differs from created_at

NOTIFY pgrst, 'reload schema';
