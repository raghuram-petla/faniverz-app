-- Auto-update trigger functions for search_vector columns.
-- Each function fires BEFORE INSERT OR UPDATE on text columns only, keeping write overhead minimal.
-- Telugu columns (title_te, synopsis_te) use 'simple' config — no Postgres Telugu stemmer exists.
-- Names/usernames use 'simple' config — they should not be stemmed.
-- All functions use SET search_path = '' with fully qualified table refs for security.

-- ── movies ───────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.movies_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')),       'A') ||
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.title_te, '')),    'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.director, '')),    'B') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.synopsis, '')),    'D') ||
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.synopsis_te, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_movies_search_vector
  BEFORE INSERT OR UPDATE OF title, title_te, director, synopsis, synopsis_te
  ON public.movies
  FOR EACH ROW
  EXECUTE FUNCTION public.movies_search_vector_update();

-- ── actors ───────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.actors_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.name, '')),      'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.biography, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_actors_search_vector
  BEFORE INSERT OR UPDATE OF name, biography
  ON public.actors
  FOR EACH ROW
  EXECUTE FUNCTION public.actors_search_vector_update();

-- ── production_houses ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.production_houses_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.name, '')),        'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_production_houses_search_vector
  BEFORE INSERT OR UPDATE OF name, description
  ON public.production_houses
  FOR EACH ROW
  EXECUTE FUNCTION public.production_houses_search_vector_update();

-- ── profiles ─────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.profiles_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.username, '')),     'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.bio, '')),          'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_search_vector
  BEFORE INSERT OR UPDATE OF display_name, username, bio
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_search_vector_update();

-- ── reviews ──────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reviews_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.body, '')),  'C');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_reviews_search_vector
  BEFORE INSERT OR UPDATE OF title, body
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_search_vector_update();

-- ── news_feed ────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.news_feed_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')),       'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_news_feed_search_vector
  BEFORE INSERT OR UPDATE OF title, description
  ON public.news_feed
  FOR EACH ROW
  EXECUTE FUNCTION public.news_feed_search_vector_update();
