-- Filter future-dated items from the public news feed
--
-- Root cause: admins can set poster_date / video_date to a future date (e.g. "release day").
-- The feed trigger stores that date directly as published_at, so the item sorts to the top
-- and formatRelativeTime() shows "Just now" for negative diffs.
--
-- Two-layer fix:
--   1. RLS policy — hide rows with published_at > now() from all SELECT queries
--   2. RPC update — add the same guard to get_personalized_feed (SECURITY DEFINER bypasses RLS)

-- ============================================================
-- 1. RLS: hide future-dated feed items from public reads
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read news feed" ON news_feed;

CREATE POLICY "Anyone can read news feed"
  ON news_feed FOR SELECT
  USING (published_at <= now());

-- ============================================================
-- 2. RPC: add published_at <= now() guard (bypasses RLS)
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
    -- @contract never surface future-dated items — admins sometimes set poster/video dates
    -- in the future (e.g. "release day"), which would sort them to the top of the feed
    nf.published_at <= now()
    AND CASE p_filter
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

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_personalized_feed TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
