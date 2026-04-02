-- Two fixes in one migration:
--
-- 1. FIX AUDIT TRIGGER ON news_feed: User engagement actions (upvotes, comments,
--    views) update counter columns on news_feed rows via triggers. The generic
--    audit_trigger logs these as admin "update" actions, polluting the audit log
--    with non-admin activity. Fix: replace the generic trigger with a conditional
--    one that only fires when actual content fields change, not counters.
--
-- 2. OPTIMIZE get_personalized_feed RPC: Add MATERIALIZED keyword to CTEs so
--    Postgres evaluates user's personalization data once (not re-inlined per row).
--    Also move the correlated watchlist EXISTS subquery into a CTE to avoid
--    per-row rescans.

-- ============================================================
-- 1. FIX: news_feed audit trigger — skip counter-only updates
-- ============================================================
DROP TRIGGER IF EXISTS audit_trigger ON news_feed;

-- INSERT and DELETE always audit (admin content changes)
CREATE TRIGGER audit_trigger_insert_delete
  AFTER INSERT OR DELETE ON news_feed
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- UPDATE only audits when content fields change (not vote/view/comment counters)
CREATE TRIGGER audit_trigger_update
  AFTER UPDATE ON news_feed
  FOR EACH ROW
  WHEN (
    OLD.feed_type IS DISTINCT FROM NEW.feed_type OR
    OLD.content_type IS DISTINCT FROM NEW.content_type OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.movie_id IS DISTINCT FROM NEW.movie_id OR
    OLD.source_table IS DISTINCT FROM NEW.source_table OR
    OLD.source_id IS DISTINCT FROM NEW.source_id OR
    OLD.thumbnail_url IS DISTINCT FROM NEW.thumbnail_url OR
    OLD.youtube_id IS DISTINCT FROM NEW.youtube_id OR
    OLD.duration IS DISTINCT FROM NEW.duration OR
    OLD.is_pinned IS DISTINCT FROM NEW.is_pinned OR
    OLD.is_featured IS DISTINCT FROM NEW.is_featured OR
    OLD.display_order IS DISTINCT FROM NEW.display_order OR
    OLD.published_at IS DISTINCT FROM NEW.published_at
  )
  EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================
-- 2. OPTIMIZE: get_personalized_feed with MATERIALIZED CTEs
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
  movie_poster_image_type text,
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
  -- MATERIALIZED forces Postgres to evaluate each CTE exactly once and store
  -- the result, rather than inlining them into the main query (PG 12+ default
  -- for single-reference CTEs). This prevents re-scanning watchlists,
  -- favorite_actors, and movie_cast for every news_feed row.
  WITH user_watchlist_movies AS MATERIALIZED (
    SELECT w.movie_id
    FROM public.watchlists w
    WHERE w.user_id = p_user_id AND p_user_id IS NOT NULL
  ),
  user_genres AS MATERIALIZED (
    SELECT UNNEST(m.genres) AS genre, COUNT(*) AS cnt
    FROM public.watchlists w
    JOIN public.movies m ON m.id = w.movie_id
    WHERE w.user_id = p_user_id AND p_user_id IS NOT NULL
    GROUP BY UNNEST(m.genres)
  ),
  user_actor_movies AS MATERIALIZED (
    SELECT DISTINCT mc.movie_id
    FROM public.favorite_actors fa
    JOIN public.movie_cast mc ON mc.actor_id = fa.actor_id
    WHERE fa.user_id = p_user_id AND p_user_id IS NOT NULL
  ),
  user_platforms AS MATERIALIZED (
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
    m.poster_image_type::text AS movie_poster_image_type,
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
          (CASE WHEN nf.movie_id IN (SELECT uwm.movie_id FROM user_watchlist_movies uwm) THEN 40 ELSE 0 END)
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
