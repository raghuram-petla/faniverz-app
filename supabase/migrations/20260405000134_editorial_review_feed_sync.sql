-- Feed sync for editorial reviews: trigger, CHECK constraint update, and get_editorial_review RPC.

-- 1. Expand feed_type CHECK to include 'editorial'
ALTER TABLE news_feed DROP CONSTRAINT IF EXISTS news_feed_feed_type_check;
ALTER TABLE news_feed ADD CONSTRAINT news_feed_feed_type_check
  CHECK (feed_type IN ('video', 'poster', 'backdrop', 'surprise', 'update', 'editorial'));

-- 2. Add editorial_rating column to news_feed (nullable, only for editorial items)
ALTER TABLE news_feed ADD COLUMN IF NOT EXISTS editorial_rating numeric;

-- 3. Trigger: sync editorial_reviews -> news_feed on publish/unpublish/delete
CREATE OR REPLACE FUNCTION sync_editorial_review_to_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_movie_title text;
  v_movie_poster text;
BEGIN
  -- On DELETE: remove feed item
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed WHERE source_table = 'editorial_reviews' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- On unpublish: remove feed item
  IF NEW.is_published = false THEN
    DELETE FROM public.news_feed WHERE source_table = 'editorial_reviews' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  -- On publish: upsert into news_feed
  SELECT title, COALESCE(poster_url, backdrop_url)
    INTO v_movie_title, v_movie_poster
    FROM public.movies WHERE id = NEW.movie_id;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, thumbnail_url, editorial_rating, published_at
  ) VALUES (
    'editorial', 'editorial_review',
    'Editorial Review: ' || COALESCE(v_movie_title, ''),
    LEFT(NEW.body, 200),
    NEW.movie_id,
    'editorial_reviews', NEW.id,
    v_movie_poster,
    NEW.overall_rating,
    COALESCE(NEW.published_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    editorial_rating = EXCLUDED.editorial_rating,
    published_at = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_editorial_review_feed
  AFTER INSERT OR UPDATE OR DELETE ON editorial_reviews
  FOR EACH ROW EXECUTE FUNCTION sync_editorial_review_to_feed();

-- 4. RPC: get editorial review for a movie with user's poll vote, craft ratings, and aggregates
CREATE OR REPLACE FUNCTION get_editorial_review(
  p_movie_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  movie_id uuid,
  title text,
  body text,
  verdict text,
  rating_story integer,
  rating_direction integer,
  rating_technical integer,
  rating_music integer,
  rating_performances integer,
  overall_rating numeric,
  agree_count integer,
  disagree_count integer,
  published_at timestamptz,
  author_display_name text,
  author_avatar_url text,
  user_poll_vote text,
  user_craft_rating_story integer,
  user_craft_rating_direction integer,
  user_craft_rating_technical integer,
  user_craft_rating_music integer,
  user_craft_rating_performances integer,
  avg_user_story numeric,
  avg_user_direction numeric,
  avg_user_technical numeric,
  avg_user_music numeric,
  avg_user_performances numeric,
  user_rating_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  SELECT
    er.id, er.movie_id, er.title, er.body, er.verdict,
    er.rating_story, er.rating_direction, er.rating_technical,
    er.rating_music, er.rating_performances, er.overall_rating,
    er.agree_count, er.disagree_count, er.published_at,
    p.display_name AS author_display_name,
    p.avatar_url AS author_avatar_url,
    poll.vote AS user_poll_vote,
    ucr.rating_story AS user_craft_rating_story,
    ucr.rating_direction AS user_craft_rating_direction,
    ucr.rating_technical AS user_craft_rating_technical,
    ucr.rating_music AS user_craft_rating_music,
    ucr.rating_performances AS user_craft_rating_performances,
    agg.avg_story AS avg_user_story,
    agg.avg_direction AS avg_user_direction,
    agg.avg_technical AS avg_user_technical,
    agg.avg_music AS avg_user_music,
    agg.avg_performances AS avg_user_performances,
    agg.rating_count AS user_rating_count
  FROM public.editorial_reviews er
  LEFT JOIN public.profiles p ON p.id = er.author_id
  LEFT JOIN public.editorial_review_polls poll
    ON poll.editorial_review_id = er.id AND poll.user_id = p_user_id
  LEFT JOIN public.user_craft_ratings ucr
    ON ucr.movie_id = er.movie_id AND ucr.user_id = p_user_id
  LEFT JOIN LATERAL (
    SELECT
      ROUND(AVG(r.rating_story)::numeric, 1) AS avg_story,
      ROUND(AVG(r.rating_direction)::numeric, 1) AS avg_direction,
      ROUND(AVG(r.rating_technical)::numeric, 1) AS avg_technical,
      ROUND(AVG(r.rating_music)::numeric, 1) AS avg_music,
      ROUND(AVG(r.rating_performances)::numeric, 1) AS avg_performances,
      COUNT(*)::integer AS rating_count
    FROM public.user_craft_ratings r
    WHERE r.movie_id = er.movie_id
  ) agg ON true
  WHERE er.movie_id = p_movie_id AND er.is_published = true;
END;
$$;

GRANT EXECUTE ON FUNCTION get_editorial_review TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
