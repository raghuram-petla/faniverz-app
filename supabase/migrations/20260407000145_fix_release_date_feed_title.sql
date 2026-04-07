-- Fix all 3 movie-property feed triggers to include actual values in titles
-- and handle removed/cleared states properly.

-- ============================================================
-- 1. release_date: date announced / moved / removed
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
  v_title text;
  v_description text;
BEGIN
  IF OLD.release_date IS NOT DISTINCT FROM NEW.release_date THEN
    RETURN NEW;
  END IF;

  v_old_date := COALESCE(to_char(OLD.release_date, 'Mon DD, YYYY'), 'TBA');
  v_new_date := COALESCE(to_char(NEW.release_date, 'Mon DD, YYYY'), 'TBA');

  IF NEW.release_date IS NULL THEN
    v_title := NEW.title || ' release date removed';
    v_description := 'Previously scheduled for ' || v_old_date || '. Stay tuned for updates!';
  ELSIF OLD.release_date IS NULL THEN
    v_title := NEW.title || ' releasing ' || v_new_date;
    v_description := 'Release date announced!';
  ELSE
    v_title := NEW.title || ' now releasing ' || v_new_date;
    v_description := 'Release date moved from ' || v_old_date || ' to ' || v_new_date || '.';
  END IF;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'release_date_update',
    v_title, v_description,
    NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. certification: rated / changed / removed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_certification_change_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_title text;
  v_description text;
BEGIN
  IF OLD.certification IS NOT DISTINCT FROM NEW.certification THEN
    RETURN NEW;
  END IF;

  IF NEW.certification IS NULL THEN
    v_title := NEW.title || ' certification removed';
    v_description := 'Previously rated ' || OLD.certification || '. Stay tuned for updates!';
  ELSIF OLD.certification IS NULL THEN
    v_title := NEW.title || ' rated ' || NEW.certification;
    v_description := NEW.title || ' has been certified ' || NEW.certification || ' by the censor board.';
  ELSE
    v_title := NEW.title || ' rating changed to ' || NEW.certification;
    v_description := 'Certification changed from ' || OLD.certification || ' to ' || NEW.certification || '.';
  END IF;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'certification_update',
    v_title, v_description,
    NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. premiere_date: announced / moved / removed
-- ============================================================
CREATE OR REPLACE FUNCTION sync_premiere_date_change_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_date text;
  v_new_date text;
  v_title text;
  v_description text;
BEGIN
  IF OLD.premiere_date IS NOT DISTINCT FROM NEW.premiere_date THEN
    RETURN NEW;
  END IF;

  v_old_date := COALESCE(to_char(OLD.premiere_date, 'Mon DD, YYYY'), 'TBA');
  v_new_date := COALESCE(to_char(NEW.premiere_date, 'Mon DD, YYYY'), 'TBA');

  IF NEW.premiere_date IS NULL THEN
    v_title := NEW.title || ' premiere date removed';
    v_description := 'Previously scheduled for ' || v_old_date || '. Stay tuned for updates!';
  ELSIF OLD.premiere_date IS NULL THEN
    v_title := NEW.title || ' premiere on ' || v_new_date;
    v_description := 'Premiere date announced!';
  ELSE
    v_title := NEW.title || ' premiere moved to ' || v_new_date;
    v_description := 'Premiere moved from ' || v_old_date || ' to ' || v_new_date || '.';
  END IF;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'premiere_date_update',
    v_title, v_description,
    NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  );

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
