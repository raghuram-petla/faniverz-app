-- Fix: strip diacritics (accents) from search terms and indexed text.
-- Problem: "Rākāsā" is stored with macron characters (ā); searching "rakasa" fails
-- because ā ≠ a at byte level — both FTS tokens and trigram similarity don't match.
-- Fix: apply public.unaccent() to normalize diacritics before indexing and querying
-- so "Rākāsā" → "Rakasa" and "rakasa" → "rakasa" → they match.

-- ── Update search_vector triggers to unaccent text ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.movies_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(NEW.title, ''))),       'A') ||
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.title_te, '')),                     'A') ||
    setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(NEW.director, ''))),    'B') ||
    setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(NEW.synopsis, ''))),    'D') ||
    setweight(to_tsvector('pg_catalog.simple',  coalesce(NEW.synopsis_te, '')),                  'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.actors_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.simple',  public.unaccent(coalesce(NEW.name, ''))),      'A') ||
    setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(NEW.biography, ''))), 'D');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.production_houses_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.simple',  public.unaccent(coalesce(NEW.name, ''))),        'A') ||
    setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(NEW.description, ''))), 'D');
  RETURN NEW;
END;
$$;

-- ── Backfill search_vectors with unaccented text ─────────────────────────────────────────────────

UPDATE public.movies SET search_vector =
  setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(title, ''))),       'A') ||
  setweight(to_tsvector('pg_catalog.simple',  coalesce(title_te, '')),                     'A') ||
  setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(director, ''))),    'B') ||
  setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(synopsis, ''))),    'D') ||
  setweight(to_tsvector('pg_catalog.simple',  coalesce(synopsis_te, '')),                  'D');

UPDATE public.actors SET search_vector =
  setweight(to_tsvector('pg_catalog.simple',  public.unaccent(coalesce(name, ''))),      'A') ||
  setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(biography, ''))), 'D');

UPDATE public.production_houses SET search_vector =
  setweight(to_tsvector('pg_catalog.simple',  public.unaccent(coalesce(name, ''))),        'A') ||
  setweight(to_tsvector('pg_catalog.english', public.unaccent(coalesce(description, ''))), 'D');

-- ── Update search_movies to unaccent term and title in trigram comparison ─────────────────────────

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
  term        text;
  tsq         tsquery;
  tsq_prefix  tsquery;
  threshold   float;
  prefix_str  text;
BEGIN
  -- @edge: unaccent strips diacritics so "rakasa" matches "Rākāsā"
  term := public.unaccent(trim(regexp_replace(search_term, '\s+', ' ', 'g')));

  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  tsq := plainto_tsquery('pg_catalog.english', term);

  SELECT string_agg(word || ':*', ' & ')
  INTO prefix_str
  FROM (
    SELECT regexp_replace(w, '[^a-zA-Z0-9]', '', 'g') AS word
    FROM regexp_split_to_table(term, '\s+') AS w
  ) words
  WHERE word != '';

  BEGIN
    tsq_prefix := to_tsquery('pg_catalog.english', coalesce(prefix_str, ''));
  EXCEPTION WHEN OTHERS THEN
    tsq_prefix := tsq;
  END;

  RETURN QUERY
  WITH fts AS (
    SELECT m.id,
           greatest(
             ts_rank_cd(m.search_vector, tsq, 32),
             ts_rank_cd(m.search_vector, tsq_prefix, 32)
           ) AS score
    FROM public.movies m
    WHERE m.search_vector @@ tsq
       OR m.search_vector @@ tsq_prefix
  ),
  trgm AS (
    SELECT m.id,
           greatest(
             extensions.similarity(public.unaccent(m.title), term),
             extensions.similarity(public.unaccent(coalesce(m.director, '')), term)
           ) AS score
    FROM public.movies m
    WHERE extensions.similarity(public.unaccent(m.title), term)                  > threshold
       OR extensions.similarity(public.unaccent(coalesce(m.director, '')), term) > threshold
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
    m.id, m.tmdb_id, m.title, m.poster_url, m.backdrop_url, m.release_date,
    m.runtime, m.genres, m.certification::text, m.synopsis, m.director,
    m.in_theaters, m.premiere_date, m.original_language,
    m.backdrop_focus_x, m.backdrop_focus_y, m.poster_focus_x, m.poster_focus_y,
    m.spotlight_focus_x, m.spotlight_focus_y, m.detail_focus_x, m.detail_focus_y,
    m.poster_image_type::text, m.backdrop_image_type::text,
    m.rating, m.review_count, m.is_featured, m.imdb_id,
    m.title_te, m.synopsis_te, m.tagline, m.tmdb_status,
    m.tmdb_vote_average, m.tmdb_vote_count, m.budget, m.revenue,
    m.tmdb_popularity, m.spoken_languages, m.collection_id, m.collection_name,
    m.tmdb_last_synced_at, m.created_at, m.updated_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.movies m ON m.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, m.rating DESC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── Update search_actors to unaccent ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_actors(
  search_term   text,
  result_limit  int  DEFAULT 10,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id                   uuid,
  tmdb_person_id       integer,
  name                 text,
  photo_url            text,
  birth_date           date,
  person_type          text,
  gender               smallint,
  biography            text,
  place_of_birth       text,
  height_cm            smallint,
  imdb_id              text,
  known_for_department text,
  also_known_as        text[],
  death_date           date,
  instagram_id         text,
  twitter_id           text,
  created_by           uuid,
  created_at           timestamptz,
  search_score         float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term        text;
  tsq         tsquery;
  tsq_prefix  tsquery;
  threshold   float;
  prefix_str  text;
BEGIN
  term := public.unaccent(trim(regexp_replace(search_term, '\s+', ' ', 'g')));

  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  tsq := plainto_tsquery('pg_catalog.simple', term);

  SELECT string_agg(word || ':*', ' & ')
  INTO prefix_str
  FROM (
    SELECT regexp_replace(w, '[^a-zA-Z0-9]', '', 'g') AS word
    FROM regexp_split_to_table(term, '\s+') AS w
  ) words
  WHERE word != '';

  BEGIN
    tsq_prefix := to_tsquery('pg_catalog.simple', coalesce(prefix_str, ''));
  EXCEPTION WHEN OTHERS THEN
    tsq_prefix := tsq;
  END;

  RETURN QUERY
  WITH fts AS (
    SELECT a.id,
           greatest(
             ts_rank_cd(a.search_vector, tsq, 32),
             ts_rank_cd(a.search_vector, tsq_prefix, 32)
           ) AS score
    FROM public.actors a
    WHERE a.search_vector @@ tsq
       OR a.search_vector @@ tsq_prefix
  ),
  trgm AS (
    SELECT a.id,
           extensions.similarity(public.unaccent(a.name), term) AS score
    FROM public.actors a
    WHERE extensions.similarity(public.unaccent(a.name), term) > threshold
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
    a.id, a.tmdb_person_id, a.name, a.photo_url, a.birth_date,
    a.person_type::text, a.gender, a.biography, a.place_of_birth,
    a.height_cm, a.imdb_id, a.known_for_department, a.also_known_as,
    a.death_date, a.instagram_id, a.twitter_id, a.created_by, a.created_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.actors a ON a.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, a.name ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── Update search_production_houses to unaccent ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_production_houses(
  search_term   text,
  result_limit  int  DEFAULT 10,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id              uuid,
  name            text,
  logo_url        text,
  description     text,
  tmdb_company_id integer,
  origin_country  text,
  created_at      timestamptz,
  search_score    float
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  term        text;
  tsq         tsquery;
  tsq_prefix  tsquery;
  threshold   float;
  prefix_str  text;
BEGIN
  term := public.unaccent(trim(regexp_replace(search_term, '\s+', ' ', 'g')));

  IF length(term) <= 3 THEN
    threshold := 0.2;
  ELSE
    threshold := 0.3;
  END IF;

  tsq := plainto_tsquery('pg_catalog.simple', term);

  SELECT string_agg(word || ':*', ' & ')
  INTO prefix_str
  FROM (
    SELECT regexp_replace(w, '[^a-zA-Z0-9]', '', 'g') AS word
    FROM regexp_split_to_table(term, '\s+') AS w
  ) words
  WHERE word != '';

  BEGIN
    tsq_prefix := to_tsquery('pg_catalog.simple', coalesce(prefix_str, ''));
  EXCEPTION WHEN OTHERS THEN
    tsq_prefix := tsq;
  END;

  RETURN QUERY
  WITH fts AS (
    SELECT ph.id,
           greatest(
             ts_rank_cd(ph.search_vector, tsq, 32),
             ts_rank_cd(ph.search_vector, tsq_prefix, 32)
           ) AS score
    FROM public.production_houses ph
    WHERE ph.search_vector @@ tsq
       OR ph.search_vector @@ tsq_prefix
  ),
  trgm AS (
    SELECT ph.id,
           extensions.similarity(public.unaccent(ph.name), term) AS score
    FROM public.production_houses ph
    WHERE extensions.similarity(public.unaccent(ph.name), term) > threshold
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
    ph.id, ph.name, ph.logo_url, ph.description,
    ph.tmdb_company_id, ph.origin_country, ph.created_at,
    c.score::float AS search_score
  FROM combined c
  JOIN public.production_houses ph ON ph.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, ph.name ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

NOTIFY pgrst, 'reload schema';
