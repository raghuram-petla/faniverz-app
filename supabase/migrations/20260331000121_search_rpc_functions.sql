-- Hybrid search RPC functions: combine tsvector full-text (60%) + pg_trgm fuzzy (40%).
-- FULL OUTER JOIN ensures results appear whether matched by FTS, trigram, or both:
--   "Pushpa 2" (correct)   → FTS dominates, trigram contributes → top score
--   "Puspa" (typo)         → FTS misses, trigram catches it → lower but present
--   "action thriller"      → FTS matches synopsis tokens, trigram misses → still found
-- Uses plainto_tsquery (safe, treats all input as literal words — no operator injection).
-- Short queries (≤3 chars) lower the pg_trgm similarity threshold to 0.2 for short titles (e.g. "RRR").
-- All functions: SECURITY INVOKER (default) so table RLS policies are applied.

-- ── search_movies ─────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_movies(
  search_term   text,
  result_limit  int  DEFAULT 10,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  tmdb_id             integer,
  title               text,
  poster_url          text,
  backdrop_url        text,
  release_date        date,
  runtime             integer,
  genres              text[],
  certification       text,
  synopsis            text,
  director            text,
  in_theaters         boolean,
  premiere_date       date,
  original_language   text,
  backdrop_focus_x    real,
  backdrop_focus_y    real,
  poster_focus_x      numeric,
  poster_focus_y      numeric,
  spotlight_focus_x   real,
  spotlight_focus_y   real,
  detail_focus_x      real,
  detail_focus_y      real,
  poster_image_type   text,
  backdrop_image_type text,
  rating              numeric,
  review_count        integer,
  is_featured         boolean,
  imdb_id             text,
  title_te            text,
  synopsis_te         text,
  tagline             text,
  tmdb_status         text,
  tmdb_vote_average   numeric,
  tmdb_vote_count     integer,
  budget              bigint,
  revenue             bigint,
  tmdb_popularity     numeric,
  spoken_languages    text[],
  collection_id       integer,
  collection_name     text,
  tmdb_last_synced_at timestamptz,
  created_at          timestamptz,
  updated_at          timestamptz,
  search_score        float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term      text;
  tsq       tsquery;
  -- @edge: SET search_path='' means % operator (pg_trgm, in extensions schema) is not resolvable.
  -- Use extensions.similarity() > threshold directly instead of the % operator shorthand.
  threshold float;
BEGIN
  term := trim(regexp_replace(search_term, '\s+', ' ', 'g'));

  -- Lower trigram threshold for short queries (e.g. "RRR", "NGK")
  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  -- plainto_tsquery: safe for user input — no operator injection
  tsq := plainto_tsquery('pg_catalog.english', term);

  RETURN QUERY
  WITH fts AS (
    SELECT m.id,
           ts_rank_cd(m.search_vector, tsq, 32) AS score
    FROM public.movies m
    WHERE m.search_vector @@ tsq
  ),
  trgm AS (
    SELECT m.id,
           greatest(
             extensions.similarity(m.title, term),
             extensions.similarity(coalesce(m.director, ''), term)
           ) AS score
    FROM public.movies m
    WHERE extensions.similarity(m.title, term)                      > threshold
       OR extensions.similarity(coalesce(m.director, ''), term)     > threshold
  ),
  combined AS (
    SELECT
      coalesce(f.id, t.id)                                   AS id,
      coalesce(f.score, 0::float) * 0.6 +
        coalesce(t.score, 0::float) * 0.4                   AS score
    FROM fts f
    FULL OUTER JOIN trgm t ON f.id = t.id
  )
  SELECT
    m.id,
    m.tmdb_id,
    m.title,
    m.poster_url,
    m.backdrop_url,
    m.release_date,
    m.runtime,
    m.genres,
    m.certification::text,
    m.synopsis,
    m.director,
    m.in_theaters,
    m.premiere_date,
    m.original_language,
    m.backdrop_focus_x,
    m.backdrop_focus_y,
    m.poster_focus_x,
    m.poster_focus_y,
    m.spotlight_focus_x,
    m.spotlight_focus_y,
    m.detail_focus_x,
    m.detail_focus_y,
    m.poster_image_type::text,
    m.backdrop_image_type::text,
    m.rating,
    m.review_count,
    m.is_featured,
    m.imdb_id,
    m.title_te,
    m.synopsis_te,
    m.tagline,
    m.tmdb_status,
    m.tmdb_vote_average,
    m.tmdb_vote_count,
    m.budget,
    m.revenue,
    m.tmdb_popularity,
    m.spoken_languages,
    m.collection_id,
    m.collection_name,
    m.tmdb_last_synced_at,
    m.created_at,
    m.updated_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.movies m ON m.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, m.rating DESC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── search_actors ─────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_actors(
  search_term   text,
  result_limit  int  DEFAULT 10,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  tmdb_person_id      integer,
  name                text,
  photo_url           text,
  birth_date          date,
  person_type         text,
  gender              smallint,
  biography           text,
  place_of_birth      text,
  height_cm           smallint,
  imdb_id             text,
  known_for_department text,
  also_known_as       text[],
  death_date          date,
  instagram_id        text,
  twitter_id          text,
  created_by          uuid,
  created_at          timestamptz,
  search_score        float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term      text;
  tsq       tsquery;
  threshold float;
BEGIN
  term := trim(regexp_replace(search_term, '\s+', ' ', 'g'));

  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  -- Use simple config for actor names (not stemmed)
  tsq := plainto_tsquery('pg_catalog.simple', term);

  RETURN QUERY
  WITH fts AS (
    SELECT a.id,
           ts_rank_cd(a.search_vector, tsq, 32) AS score
    FROM public.actors a
    WHERE a.search_vector @@ tsq
  ),
  trgm AS (
    SELECT a.id,
           extensions.similarity(a.name, term) AS score
    FROM public.actors a
    WHERE extensions.similarity(a.name, term) > threshold
  ),
  combined AS (
    SELECT
      coalesce(f.id, t.id)                                   AS id,
      coalesce(f.score, 0::float) * 0.6 +
        coalesce(t.score, 0::float) * 0.4                   AS score
    FROM fts f
    FULL OUTER JOIN trgm t ON f.id = t.id
  )
  SELECT
    a.id,
    a.tmdb_person_id,
    a.name,
    a.photo_url,
    a.birth_date,
    a.person_type::text,
    a.gender,
    a.biography,
    a.place_of_birth,
    a.height_cm,
    a.imdb_id,
    a.known_for_department,
    a.also_known_as,
    a.death_date,
    a.instagram_id,
    a.twitter_id,
    a.created_by,
    a.created_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.actors a ON a.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, a.name ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── search_production_houses ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_production_houses(
  search_term   text,
  result_limit  int  DEFAULT 10,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  name             text,
  logo_url         text,
  description      text,
  tmdb_company_id  integer,
  origin_country   text,
  created_at       timestamptz,
  search_score     float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term      text;
  tsq       tsquery;
  threshold float;
BEGIN
  term := trim(regexp_replace(search_term, '\s+', ' ', 'g'));

  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  tsq := plainto_tsquery('pg_catalog.simple', term);

  RETURN QUERY
  WITH fts AS (
    SELECT ph.id,
           ts_rank_cd(ph.search_vector, tsq, 32) AS score
    FROM public.production_houses ph
    WHERE ph.search_vector @@ tsq
  ),
  trgm AS (
    SELECT ph.id,
           extensions.similarity(ph.name, term) AS score
    FROM public.production_houses ph
    WHERE extensions.similarity(ph.name, term) > threshold
  ),
  combined AS (
    SELECT
      coalesce(f.id, t.id)                                   AS id,
      coalesce(f.score, 0::float) * 0.6 +
        coalesce(t.score, 0::float) * 0.4                   AS score
    FROM fts f
    FULL OUTER JOIN trgm t ON f.id = t.id
  )
  SELECT
    ph.id,
    ph.name,
    ph.logo_url,
    ph.description,
    ph.tmdb_company_id,
    ph.origin_country,
    ph.created_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.production_houses ph ON ph.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, ph.name ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── search_profiles ───────────────────────────────────────────────────────────────────────────────
-- Used by admin end-users search. RLS on profiles applies (SECURITY INVOKER default).

CREATE OR REPLACE FUNCTION public.search_profiles(
  search_term   text,
  result_limit  int  DEFAULT 50,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id             uuid,
  display_name   text,
  username       text,
  email          text,
  avatar_url     text,
  bio            text,
  location       text,
  preferred_lang text,
  created_at     timestamptz,
  search_score   float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term      text;
  tsq       tsquery;
  threshold float;
BEGIN
  term := trim(regexp_replace(search_term, '\s+', ' ', 'g'));

  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  tsq := plainto_tsquery('pg_catalog.simple', term);

  RETURN QUERY
  WITH fts AS (
    SELECT p.id,
           ts_rank_cd(p.search_vector, tsq, 32) AS score
    FROM public.profiles p
    WHERE p.search_vector @@ tsq
  ),
  trgm AS (
    SELECT p.id,
           greatest(
             extensions.similarity(coalesce(p.display_name, ''), term),
             extensions.similarity(coalesce(p.username, ''), term)
           ) AS score
    FROM public.profiles p
    WHERE extensions.similarity(coalesce(p.display_name, ''), term) > threshold
       OR extensions.similarity(coalesce(p.username, ''), term)     > threshold
  ),
  combined AS (
    SELECT
      coalesce(f.id, t.id)                                   AS id,
      coalesce(f.score, 0::float) * 0.6 +
        coalesce(t.score, 0::float) * 0.4                   AS score
    FROM fts f
    FULL OUTER JOIN trgm t ON f.id = t.id
  )
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.email,
    p.avatar_url,
    p.bio,
    p.location,
    p.preferred_lang,
    p.created_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.profiles p ON p.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, p.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── search_reviews ────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_reviews(
  search_term   text,
  result_limit  int  DEFAULT 200
)
RETURNS TABLE (
  id         uuid,
  movie_id   uuid,
  user_id    uuid,
  title      text,
  body       text,
  rating     integer,
  contains_spoiler boolean,
  created_at timestamptz,
  updated_at timestamptz,
  search_score float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term      text;
  tsq       tsquery;
  threshold float := 0.3;
BEGIN
  term := trim(regexp_replace(search_term, '\s+', ' ', 'g'));
  tsq  := plainto_tsquery('pg_catalog.english', term);

  RETURN QUERY
  WITH fts AS (
    SELECT r.id,
           ts_rank_cd(r.search_vector, tsq, 32) AS score
    FROM public.reviews r
    WHERE r.search_vector @@ tsq
  ),
  trgm AS (
    SELECT r.id,
           extensions.similarity(coalesce(r.title, ''), term) AS score
    FROM public.reviews r
    WHERE extensions.similarity(coalesce(r.title, ''), term) > threshold
  ),
  combined AS (
    SELECT
      coalesce(f.id, t.id)                                   AS id,
      coalesce(f.score, 0::float) * 0.6 +
        coalesce(t.score, 0::float) * 0.4                   AS score
    FROM fts f
    FULL OUTER JOIN trgm t ON f.id = t.id
  )
  SELECT
    r.id,
    r.movie_id,
    r.user_id,
    r.title,
    r.body,
    r.rating,
    r.contains_spoiler,
    r.created_at,
    r.updated_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.reviews r ON r.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, r.created_at DESC
  LIMIT result_limit;
END;
$$;

NOTIFY pgrst, 'reload schema';
