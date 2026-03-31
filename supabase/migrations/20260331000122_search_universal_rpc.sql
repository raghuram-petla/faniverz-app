-- Universal search RPC: replaces 3 parallel HTTP round-trips with a single RPC call.
-- Returns jsonb with keys: movies, actors, production_houses.
-- Each value is a JSON array of search results including search_score.
-- @contract: result_limit applies per entity type, not total.

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
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
