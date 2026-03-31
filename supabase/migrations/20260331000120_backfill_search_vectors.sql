-- Backfill search_vector for all existing rows.
-- Triggers created in 000118 only fire on future writes — this populates historical data.
-- Runs after triggers exist so the same logic is applied consistently.

UPDATE public.movies SET search_vector =
  setweight(to_tsvector('pg_catalog.english', coalesce(title, '')),       'A') ||
  setweight(to_tsvector('pg_catalog.simple',  coalesce(title_te, '')),    'A') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(director, '')),    'B') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(synopsis, '')),    'D') ||
  setweight(to_tsvector('pg_catalog.simple',  coalesce(synopsis_te, '')), 'D');

UPDATE public.actors SET search_vector =
  setweight(to_tsvector('pg_catalog.simple',  coalesce(name, '')),      'A') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(biography, '')), 'D');

UPDATE public.production_houses SET search_vector =
  setweight(to_tsvector('pg_catalog.simple',  coalesce(name, '')),        'A') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(description, '')), 'D');

UPDATE public.profiles SET search_vector =
  setweight(to_tsvector('pg_catalog.simple',  coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('pg_catalog.simple',  coalesce(username, '')),     'A') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(bio, '')),          'D');

UPDATE public.reviews SET search_vector =
  setweight(to_tsvector('pg_catalog.english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(body, '')),  'C');

UPDATE public.news_feed SET search_vector =
  setweight(to_tsvector('pg_catalog.english', coalesce(title, '')),       'A') ||
  setweight(to_tsvector('pg_catalog.english', coalesce(description, '')), 'C');
