-- Suppress automatic news_feed creation during TMDB sync operations.
--
-- Problem: When movies are imported/refreshed from TMDB, database triggers on
-- movie_videos, movie_images, movies, and movie_platforms automatically create
-- news_feed entries. This floods the feed with low-quality auto-generated content
-- that should only appear when admins manually add content.
--
-- Fix: Each trigger now checks for TMDB-specific markers on the inserted row.
-- If the row came from TMDB sync (has tmdb_video_key, tmdb_file_path, tmdb_id,
-- or links to a tmdb-sourced platform), the trigger skips feed creation.
-- Admin-created content (without these markers) still generates feed entries.

-- ============================================================
-- 1. movie_videos → news_feed: skip when tmdb_video_key is set
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

  -- Skip feed creation for TMDB-synced videos
  IF NEW.tmdb_video_key IS NOT NULL THEN
    RETURN NEW;
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
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    youtube_id    = EXCLUDED.youtube_id,
    duration      = EXCLUDED.duration,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at  = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. movie_images → news_feed: skip when tmdb_file_path is set
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_poster_to_feed()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
  v_feed_type   text;
  v_content_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed
    WHERE source_table = 'movie_images' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Skip feed creation for TMDB-synced images
  IF NEW.tmdb_file_path IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.image_type = 'backdrop' THEN
    v_feed_type    := 'backdrop';
    v_content_type := 'backdrop';
  ELSE
    v_feed_type    := 'poster';
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
    COALESCE(NEW.poster_date, NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    feed_type     = EXCLUDED.feed_type,
    content_type  = EXCLUDED.content_type,
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at  = COALESCE(EXCLUDED.published_at, public.news_feed.published_at, now());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. movies INSERT → news_feed: skip when tmdb_id is set
-- ============================================================
CREATE OR REPLACE FUNCTION sync_new_movie_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Skip feed creation for TMDB-imported movies
  IF NEW.tmdb_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, thumbnail_url, published_at
  ) VALUES (
    'update', 'new_movie',
    'New Movie: ' || NEW.title,
    COALESCE(NEW.synopsis, 'A new movie has been announced!'),
    NEW.id,
    'movies', NEW.id,
    COALESCE(NEW.poster_url, NEW.backdrop_url),
    now()
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. movie_platforms INSERT → news_feed: skip when platform is TMDB-sourced
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ott_release_to_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_movie_title text;
  v_movie_poster text;
  v_platform_name text;
  v_tmdb_provider_id integer;
BEGIN
  -- Skip feed creation for TMDB-synced platform links
  SELECT tmdb_provider_id INTO v_tmdb_provider_id
    FROM public.platforms WHERE id = NEW.platform_id;
  IF v_tmdb_provider_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only create if no ott_release feed item exists for this movie+platform combo
  SELECT name INTO v_platform_name
    FROM public.platforms WHERE id = NEW.platform_id;

  IF EXISTS (
    SELECT 1 FROM public.news_feed
    WHERE movie_id = NEW.movie_id
      AND content_type = 'ott_release'
      AND title LIKE '%' || v_platform_name || '%'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT title, COALESCE(poster_url, backdrop_url)
    INTO v_movie_title, v_movie_poster
    FROM public.movies WHERE id = NEW.movie_id;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    thumbnail_url, published_at
  ) VALUES (
    'update', 'ott_release',
    v_movie_title || ' now streaming on ' || v_platform_name,
    'Watch ' || v_movie_title || ' on ' || v_platform_name || '.',
    NEW.movie_id,
    v_movie_poster,
    now()
  );
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
