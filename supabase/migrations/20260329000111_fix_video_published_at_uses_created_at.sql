-- Fix video feed items using future video_date as published_at
--
-- Root cause: migration 20260329000108 rewrote sync_movie_video_to_feed() to fix
-- null published_at, but accidentally reintroduced video_date as the first COALESCE
-- value:
--   COALESCE(NEW.video_date, NEW.created_at, now())
--
-- Migration 20260327000104 had deliberately set published_at = NEW.created_at for
-- videos (not video_date), so newly imported videos appear at the top of the feed.
-- video_date comes from TMDB's video.published_at, which is often a future date for
-- upcoming movies — causing the feed item to be hidden by the published_at <= now() RLS.
--
-- Fix:
--   1. Restore trigger to use created_at (not video_date) for video published_at
--   2. Backfill any existing video feed items with future published_at to their
--      source movie_video's created_at (or now() if that's also null/future)

-- ============================================================
-- 1. Fix trigger: use created_at for video published_at
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
    -- Use created_at (import time), NOT video_date (TMDB original date which can be future)
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    youtube_id    = EXCLUDED.youtube_id,
    duration      = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url,
    -- Only update published_at when incoming value is non-null
    published_at  = COALESCE(EXCLUDED.published_at, public.news_feed.published_at, now());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Backfill: fix existing video feed items with future published_at
--    Use the source movie_video's created_at; cap to now() if that's
--    also null or in the future (shouldn't happen, but safe).
-- ============================================================
UPDATE public.news_feed nf
SET published_at = LEAST(COALESCE(mv.created_at, now()), now())
FROM public.movie_videos mv
WHERE nf.source_table = 'movie_videos'
  AND nf.source_id = mv.id
  AND nf.published_at > now();

NOTIFY pgrst, 'reload schema';
