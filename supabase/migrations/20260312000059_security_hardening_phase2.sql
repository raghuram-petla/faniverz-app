-- Security hardening phase 2: profiles RLS, trigger search_path,
-- REVOKE/GRANT on helper functions, re-grant get_personalized_feed

-- ============================================================
-- 1. Fix profiles RLS: remove anon access, require authentication
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 2. Fix news_feed trigger functions: add SECURITY DEFINER SET search_path = ''
--    Preserves original function bodies with fully-qualified table refs
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
    COALESCE(NEW.video_date, NEW.created_at)
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

CREATE OR REPLACE FUNCTION sync_movie_poster_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed WHERE source_table = 'movie_posters' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT title INTO v_movie_title FROM public.movies WHERE id = NEW.movie_id;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, thumbnail_url, published_at
  ) VALUES (
    'poster', 'poster',
    COALESCE(v_movie_title, '') || ' - ' || NEW.title,
    NEW.description, NEW.movie_id,
    'movie_posters', NEW.id, NEW.image_url,
    COALESCE(NEW.poster_date, NEW.created_at)
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_surprise_to_feed()
RETURNS trigger
LANGUAGE plpgsql
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
    content_type = EXCLUDED.content_type,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    youtube_id = EXCLUDED.youtube_id,
    duration = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. REVOKE/GRANT on SECURITY DEFINER helper functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION get_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION get_admin_ph_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_ph_ids() TO authenticated;

-- Lock down trigger functions (they run as triggers, not called directly)
REVOKE EXECUTE ON FUNCTION sync_movie_video_to_feed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sync_movie_poster_to_feed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sync_surprise_to_feed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION audit_trigger_fn() FROM PUBLIC;

-- ============================================================
-- 4. Re-grant get_personalized_feed to authenticated
--    (may have been lost after DROP+CREATE in migration 000045)
-- ============================================================
GRANT EXECUTE ON FUNCTION get_personalized_feed(uuid, int, int) TO authenticated;

-- ============================================================
-- 5. Revoke anon access to audit_log_view
-- ============================================================
REVOKE SELECT ON audit_log_view FROM anon;

NOTIFY pgrst, 'reload schema';
