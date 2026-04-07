-- Auto-generate news_feed entries when key movie properties change:
-- 1. release_date  → content_type = 'release_date_update'
-- 2. certification → content_type = 'certification_update'
-- 3. premiere_date → content_type = 'premiere_date_update'
--
-- All use feed_type = 'update' (existing). No TMDB suppression needed —
-- these are intentional admin edits, not bulk-sync operations.

-- ============================================================
-- 1. release_date changed → news_feed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_release_date_change_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_date text;
  v_new_date text;
BEGIN
  -- Only fire when release_date actually changes
  IF OLD.release_date IS NOT DISTINCT FROM NEW.release_date THEN
    RETURN NEW;
  END IF;

  v_old_date := COALESCE(to_char(OLD.release_date, 'Mon DD, YYYY'), 'TBA');
  v_new_date := COALESCE(to_char(NEW.release_date, 'Mon DD, YYYY'), 'TBA');

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'release_date_update',
    NEW.title || ' release date updated',
    'Release date moved from ' || v_old_date || ' to ' || v_new_date,
    NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_release_date_feed
  AFTER UPDATE ON public.movies
  FOR EACH ROW
  EXECUTE FUNCTION sync_release_date_change_to_feed();

-- ============================================================
-- 2. certification set or changed → news_feed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_certification_change_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only fire when certification actually changes
  IF OLD.certification IS NOT DISTINCT FROM NEW.certification THEN
    RETURN NEW;
  END IF;

  -- Only create entry when certification is set to a value (not cleared)
  IF NEW.certification IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'certification_update',
    NEW.title || ' rated ' || NEW.certification,
    NEW.title || ' has been certified ' || NEW.certification || ' by the censor board.',
    NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_certification_feed
  AFTER UPDATE ON public.movies
  FOR EACH ROW
  EXECUTE FUNCTION sync_certification_change_to_feed();

-- ============================================================
-- 3. premiere_date set or changed → news_feed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_premiere_date_change_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_date text;
BEGIN
  -- Only fire when premiere_date actually changes
  IF OLD.premiere_date IS NOT DISTINCT FROM NEW.premiere_date THEN
    RETURN NEW;
  END IF;

  -- Only create entry when premiere_date is set (not cleared)
  IF NEW.premiere_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_date := to_char(NEW.premiere_date, 'Mon DD, YYYY');

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'premiere_date_update',
    NEW.title || ' premiere on ' || v_new_date,
    'Catch the premiere of ' || NEW.title || ' on ' || v_new_date || '!',
    NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_premiere_date_feed
  AFTER UPDATE ON public.movies
  FOR EACH ROW
  EXECUTE FUNCTION sync_premiere_date_change_to_feed();

NOTIFY pgrst, 'reload schema';
