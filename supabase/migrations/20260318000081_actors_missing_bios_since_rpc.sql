-- RPC function: find actors with TMDB ID but no biography,
-- filtered to only actors appearing in movies released since a given year.
CREATE OR REPLACE FUNCTION actors_missing_bios_since(since_year int, max_items int DEFAULT 200)
RETURNS TABLE(id uuid, name text, tmdb_person_id int)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT DISTINCT a.id, a.name, a.tmdb_person_id
  FROM actors a
  INNER JOIN movie_cast mc ON mc.actor_id = a.id
  INNER JOIN movies m ON m.id = mc.movie_id
  WHERE a.tmdb_person_id IS NOT NULL
    AND a.biography IS NULL
    AND m.release_date >= (since_year || '-01-01')::date
  ORDER BY a.name
  LIMIT max_items;
$$;
