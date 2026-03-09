-- Fix stale news_feed.thumbnail_url values after image migration to R2/MinIO.
--
-- The backfill script migrated movies.poster_url to R2 but did not propagate
-- changes to news_feed.thumbnail_url. This migration:
--   1. Syncs existing stale URLs from movies.poster_url
--   2. Updates the RPC to always use the latest movies.poster_url
--   3. Adds a propagation trigger so future poster_url changes auto-sync

-- ============================================================
-- 1. DATA FIX: sync stale news_feed.thumbnail_url from movies
-- ============================================================

-- For update-type items (new_movie, ott_release, theatrical_release, rating_milestone)
-- that have a movie_id, use the current movies.poster_url
UPDATE news_feed nf
SET thumbnail_url = COALESCE(m.poster_url, m.backdrop_url)
FROM movies m
WHERE nf.movie_id = m.id
  AND nf.feed_type = 'update'
  AND COALESCE(m.poster_url, m.backdrop_url) IS NOT NULL;

-- For poster-type items, sync from movies.poster_url as fallback
-- (movie_posters.image_url may also be stale)
UPDATE news_feed nf
SET thumbnail_url = m.poster_url
FROM movies m
WHERE nf.movie_id = m.id
  AND nf.feed_type = 'poster'
  AND m.poster_url IS NOT NULL
  AND nf.thumbnail_url NOT LIKE '%localhost%'
  AND nf.thumbnail_url NOT LIKE '%10.0.0%'
  AND nf.thumbnail_url NOT LIKE '%r2.dev%';

-- ============================================================
-- 2. RPC FIX: prefer movies.poster_url for movie-linked items
-- ============================================================

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
    -- Use latest movies.poster_url for movie-linked non-YouTube items
    CASE
      WHEN nf.youtube_id IS NOT NULL THEN nf.thumbnail_url
      WHEN nf.movie_id IS NOT NULL AND m.poster_url IS NOT NULL THEN m.poster_url
      ELSE nf.thumbnail_url
    END AS thumbnail_url,
    nf.youtube_id, nf.duration,
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
    CASE p_filter
      WHEN 'all' THEN true
      WHEN 'trailers' THEN nf.feed_type = 'video' AND nf.content_type IN ('trailer', 'teaser', 'glimpse', 'promo')
      WHEN 'songs' THEN nf.content_type = 'song'
      WHEN 'posters' THEN nf.feed_type = 'poster'
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

-- ============================================================
-- 3. TRIGGER: propagate movies.poster_url changes to news_feed
-- ============================================================

CREATE OR REPLACE FUNCTION propagate_movie_poster_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.poster_url IS DISTINCT FROM NEW.poster_url THEN
    UPDATE public.news_feed
    SET thumbnail_url = COALESCE(NEW.poster_url, NEW.backdrop_url)
    WHERE movie_id = NEW.id
      AND youtube_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_movie_poster
  AFTER UPDATE OF poster_url ON movies
  FOR EACH ROW EXECUTE FUNCTION propagate_movie_poster_to_feed();

NOTIFY pgrst, 'reload schema';
