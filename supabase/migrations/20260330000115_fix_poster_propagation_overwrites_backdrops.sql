-- Fix backdrop feed entries showing wrong images (poster URL instead of backdrop URL).
--
-- Root cause: propagate_movie_poster_to_feed() fires when movies.poster_url changes
-- and blindly updates ALL non-YouTube feed entries for that movie — including poster
-- and backdrop entries that have their own image_url from movie_images.
-- This overwrites correct backdrop thumbnail_urls with the movie's poster URL.
-- The client then fetches the poster key from the BACKDROPS bucket, showing wrong images.
--
-- Three fixes:
--   1. TRIGGER FIX: scope propagation to 'update' feed_type only (the only type that
--      should use movies.poster_url as its thumbnail)
--   2. DATA REPAIR: restore correct thumbnail_url for all poster/backdrop feed entries
--      by joining back to movie_images.image_url via source_id
--   3. RPC FIX: restore 'posters' filter to include backdrops (regressed in migration 109)

-- ============================================================
-- 1. Fix propagation trigger: only update 'update' feed entries
-- ============================================================
CREATE OR REPLACE FUNCTION propagate_movie_poster_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.poster_url IS DISTINCT FROM NEW.poster_url THEN
    -- @contract: only propagate to 'update' feed entries (new_movie, ott_release, etc.)
    -- Poster and backdrop feed entries have their own image_url from movie_images;
    -- overwriting them causes wrong-bucket lookups on the client.
    UPDATE public.news_feed
    SET thumbnail_url = COALESCE(NEW.poster_url, NEW.backdrop_url)
    WHERE movie_id = NEW.id
      AND youtube_id IS NULL
      AND feed_type NOT IN ('poster', 'backdrop');
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Data repair: fix all poster/backdrop feed entries with wrong thumbnail_url
-- ============================================================
UPDATE public.news_feed nf
SET thumbnail_url = mi.image_url
FROM public.movie_images mi
WHERE nf.source_table = 'movie_images'
  AND nf.source_id = mi.id
  AND nf.thumbnail_url IS DISTINCT FROM mi.image_url;

-- ============================================================
-- 3. RPC fix: restore 'posters' filter to include backdrops
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
    -- @contract never surface future-dated items
    nf.published_at <= now()
    AND CASE p_filter
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

GRANT EXECUTE ON FUNCTION get_personalized_feed TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
