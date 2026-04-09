-- Add search_platforms RPC and update search_universal to include platforms.
-- Platforms table has no search_vector column — FTS vector is computed inline.
-- @contract: result_limit applies per entity type (same as other search functions).

CREATE OR REPLACE FUNCTION public.search_platforms(
  search_term   text,
  result_limit  int  DEFAULT 10,
  result_offset int  DEFAULT 0
)
RETURNS TABLE (
  id                  text,
  name                text,
  logo                text,
  color               text,
  display_order       integer,
  logo_url            text,
  tmdb_provider_id    integer,
  regions             text[],
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
  -- @edge: unaccent strips diacritics so accented platform names still match
  term := extensions.unaccent(trim(regexp_replace(search_term, '\s+', ' ', 'g')));

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
    -- @assumes: no stored search_vector on platforms — compute inline with simple config
    SELECT p.id,
           greatest(
             ts_rank_cd(to_tsvector('pg_catalog.simple', extensions.unaccent(p.name)), tsq, 32),
             ts_rank_cd(to_tsvector('pg_catalog.simple', extensions.unaccent(p.name)), tsq_prefix, 32)
           ) AS score
    FROM public.platforms p
    WHERE to_tsvector('pg_catalog.simple', extensions.unaccent(p.name)) @@ tsq
       OR to_tsvector('pg_catalog.simple', extensions.unaccent(p.name)) @@ tsq_prefix
  ),
  trgm AS (
    SELECT p.id,
           extensions.similarity(extensions.unaccent(p.name), term) AS score
    FROM public.platforms p
    WHERE extensions.similarity(extensions.unaccent(p.name), term) > threshold
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
    p.id, p.name, p.logo, p.color, p.display_order,
    p.logo_url, p.tmdb_provider_id, p.regions,
    c.score::float AS search_score
  FROM combined c
  JOIN public.platforms p ON p.id = c.id
  WHERE c.score >= 0.01
  ORDER BY c.score DESC, p.display_order ASC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── Update search_universal to include platforms ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_universal(
  search_term  text,
  result_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN jsonb_build_object(
    'movies',
    coalesce(
      (SELECT jsonb_agg(row_to_json(r))
         FROM public.search_movies(search_term, result_limit) r),
      '[]'::jsonb
    ),
    'actors',
    coalesce(
      (SELECT jsonb_agg(row_to_json(r))
         FROM public.search_actors(search_term, result_limit) r),
      '[]'::jsonb
    ),
    'production_houses',
    coalesce(
      (SELECT jsonb_agg(row_to_json(r))
         FROM public.search_production_houses(search_term, result_limit) r),
      '[]'::jsonb
    ),
    'platforms',
    coalesce(
      (SELECT jsonb_agg(row_to_json(r))
         FROM public.search_platforms(search_term, result_limit) r),
      '[]'::jsonb
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
