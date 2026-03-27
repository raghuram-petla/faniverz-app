-- Fix two feed issues:
-- 1. Videos: use created_at (import time) for published_at, not video_date (TMDB original date)
--    This ensures newly imported videos appear at the top of the feed, matching poster behavior.
-- 2. Backdrops: create feed entries for backdrop images (previously skipped).

-- ============================================================
-- 1. Add 'backdrop' to feed_type CHECK constraint
-- ============================================================
ALTER TABLE public.news_feed DROP CONSTRAINT news_feed_feed_type_check;
ALTER TABLE public.news_feed ADD CONSTRAINT news_feed_feed_type_check
  CHECK (feed_type IN ('video', 'poster', 'backdrop', 'surprise', 'update'));

-- ============================================================
-- 2. Update video trigger: use created_at for published_at
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_video_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed
    WHERE source_table = 'movie_videos' AND source_id = OLD.id;
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

-- ============================================================
-- 3. Update poster/image trigger: include backdrops
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_poster_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
  v_feed_type text;
  v_content_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed
    WHERE source_table = 'movie_images' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Set feed_type based on image_type
  IF NEW.image_type = 'backdrop' THEN
    v_feed_type := 'backdrop';
    v_content_type := 'backdrop';
  ELSE
    v_feed_type := 'poster';
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
    COALESCE(NEW.poster_date, NEW.created_at)
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    feed_type = EXCLUDED.feed_type,
    content_type = EXCLUDED.content_type,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Fix existing video feed entries: update published_at to created_at
-- ============================================================
UPDATE public.news_feed nf
SET published_at = mv.created_at
FROM public.movie_videos mv
WHERE nf.source_table = 'movie_videos'
  AND nf.source_id = mv.id;

-- ============================================================
-- 5. Backfill: create feed entries for existing backdrops
-- ============================================================
INSERT INTO public.news_feed (
  feed_type, content_type, title, description, movie_id,
  source_table, source_id, thumbnail_url, published_at
)
SELECT
  'backdrop', 'backdrop',
  COALESCE(m.title, '') || ' - ' || COALESCE(mi.title, 'Image'),
  mi.description, mi.movie_id,
  'movie_images', mi.id, mi.image_url,
  mi.created_at
FROM public.movie_images mi
LEFT JOIN public.movies m ON m.id = mi.movie_id
WHERE mi.image_type = 'backdrop'
ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL DO NOTHING;

-- ============================================================
-- 6. Update personalized feed RPC: include backdrops in 'posters' filter
-- ============================================================
DROP FUNCTION IF EXISTS get_personalized_feed(uuid, text, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id uuid DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  feed_type text,
  content_type text,
  title text,
  description text,
  movie_id uuid,
  source_table text,
  source_id uuid,
  thumbnail_url text,
  youtube_id text,
  duration text,
  is_pinned boolean,
  is_featured boolean,
  display_order integer,
  published_at timestamptz,
  created_at timestamptz,
  upvote_count integer,
  downvote_count integer,
  view_count integer,
  comment_count integer,
  movie_title text,
  movie_poster_url text,
  movie_release_date date,
  score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH user_genres AS (
    SELECT UNNEST(m.genres) AS genre, COUNT(*) AS cnt
    FROM public.watchlists w
    JOIN public.movies m ON m.id = w.movie_id
    WHERE w.user_id = p_user_id AND p_user_id IS NOT NULL
    GROUP BY UNNEST(m.genres)
  ),
  user_actor_movies AS (
    SELECT DISTINCT mc.movie_id
    FROM public.favorite_actors fa
    JOIN public.movie_cast mc ON mc.actor_id = fa.actor_id
    WHERE fa.user_id = p_user_id AND p_user_id IS NOT NULL
  ),
  user_platforms AS (
    SELECT DISTINCT mp.platform_id
    FROM public.watchlists w
    JOIN public.movie_platforms mp ON mp.movie_id = w.movie_id
    WHERE w.user_id = p_user_id AND w.status = 'watched' AND p_user_id IS NOT NULL
  )
  SELECT
    nf.id, nf.feed_type, nf.content_type, nf.title, nf.description,
    nf.movie_id, nf.source_table, nf.source_id,
    nf.thumbnail_url, nf.youtube_id, nf.duration,
    nf.is_pinned, nf.is_featured, nf.display_order,
    nf.published_at, nf.created_at,
    nf.upvote_count, nf.downvote_count,
    nf.view_count, nf.comment_count,
    m.title AS movie_title,
    m.poster_url AS movie_poster_url,
    m.release_date AS movie_release_date,
    (
      -- Freshness (30%): exponential decay, half-life 3 days (259200 seconds)
      (100.0 * EXP(-0.693 * EXTRACT(EPOCH FROM (now() - nf.published_at)) / 259200.0)) * 0.30
      -- Popularity (20%): movie review_count and rating
      + (CASE WHEN nf.movie_id IS NULL THEN 30
              ELSE LEAST(100, COALESCE(m.review_count, 0) * 5 + COALESCE(m.rating, 0) * 10)
         END) * 0.20
      -- Personalization (25%): watchlist, actors, genres, platforms
      + (CASE WHEN p_user_id IS NULL THEN 0 ELSE
          (CASE WHEN EXISTS (
            SELECT 1 FROM public.watchlists wl
            WHERE wl.user_id = p_user_id AND wl.movie_id = nf.movie_id
          ) THEN 40 ELSE 0 END)
          + (CASE WHEN nf.movie_id IN (SELECT uam.movie_id FROM user_actor_movies uam) THEN 30 ELSE 0 END)
          + (CASE WHEN nf.movie_id IS NOT NULL AND m.genres IS NOT NULL THEN
              LEAST(20, (SELECT COUNT(*) FROM user_genres ug WHERE ug.genre = ANY(m.genres))::integer * 5)
             ELSE 0 END)
          + (CASE WHEN EXISTS (
              SELECT 1 FROM public.movie_platforms mp2
              JOIN user_platforms up ON up.platform_id = mp2.platform_id
              WHERE mp2.movie_id = nf.movie_id
            ) THEN 10 ELSE 0 END)
         END) * 0.25
      -- Admin priority (15%): pinned, featured
      + (CASE WHEN nf.is_pinned THEN 100
              WHEN nf.is_featured THEN 70
              WHEN m.is_featured THEN 40
              ELSE 0 END) * 0.15
      -- Engagement (10%): upvotes minus downvotes
      + (LEAST(100, GREATEST(0, COALESCE(nf.upvote_count, 0) * 3 - COALESCE(nf.downvote_count, 0) * 2))) * 0.10
    )::numeric AS score
  FROM public.news_feed nf
  LEFT JOIN public.movies m ON m.id = nf.movie_id
  WHERE
    CASE p_filter
      WHEN 'all' THEN true
      WHEN 'trailers' THEN nf.feed_type = 'video' AND nf.content_type IN ('trailer', 'teaser', 'glimpse', 'promo')
      WHEN 'songs' THEN nf.content_type = 'song'
      WHEN 'posters' THEN nf.feed_type IN ('poster', 'backdrop')
      WHEN 'bts' THEN nf.content_type IN ('bts', 'interview', 'event', 'making')
      WHEN 'surprise' THEN nf.feed_type = 'surprise'
      WHEN 'updates' THEN nf.feed_type = 'update'
      ELSE true
    END
  ORDER BY nf.is_pinned DESC, score DESC, nf.published_at DESC, nf.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_personalized_feed(uuid, text, int, int) TO authenticated;

NOTIFY pgrst, 'reload schema';
