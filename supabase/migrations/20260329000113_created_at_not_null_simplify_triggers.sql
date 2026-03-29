-- Add NOT NULL constraint to created_at on feed-source tables, and simplify triggers
--
-- movie_videos, movie_images, and surprise_content all had created_at DEFAULT now()
-- but no NOT NULL constraint. The default means it's never null in practice, but
-- without the constraint the triggers were written defensively with COALESCE(NEW.created_at, now()).
-- Now that the constraint is enforced, simplify to NEW.created_at directly.

-- ============================================================
-- 1. Add NOT NULL constraints
-- ============================================================
ALTER TABLE public.movie_videos  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.movie_images  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.surprise_content ALTER COLUMN created_at SET NOT NULL;

-- ============================================================
-- 2. Simplify sync_movie_video_to_feed: use NEW.created_at directly
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_video_to_feed()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed WHERE source_table = 'movie_videos' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT title INTO v_movie_title FROM public.movies WHERE id = NEW.movie_id;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, youtube_id, duration,
    thumbnail_url, published_at
  ) VALUES (
    'video', NEW.video_type,
    COALESCE(v_movie_title, '') || ' - ' || NEW.title,
    NEW.description, NEW.movie_id,
    'movie_videos', NEW.id, NEW.youtube_id, NEW.duration,
    'https://img.youtube.com/vi/' || NEW.youtube_id || '/hqdefault.jpg',
    NEW.created_at
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    youtube_id    = EXCLUDED.youtube_id,
    duration      = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at  = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Simplify sync_surprise_to_feed: use NEW.created_at directly
-- ============================================================
CREATE OR REPLACE FUNCTION sync_surprise_to_feed()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed WHERE source_table = 'surprise_content' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.news_feed (
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
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    youtube_id    = EXCLUDED.youtube_id,
    duration      = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
