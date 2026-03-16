-- Backfill movie_posters for movies that have poster_url set but no gallery entries.
-- This covers all movies created/edited before the poster gallery model was introduced,
-- where the poster was stored only in movies.poster_url.
-- The inserted row becomes the main poster for the movie.
INSERT INTO movie_posters (movie_id, image_url, title, is_main, display_order)
SELECT
  m.id          AS movie_id,
  m.poster_url  AS image_url,
  'Main Poster' AS title,
  true          AS is_main,
  0             AS display_order
FROM movies m
WHERE m.poster_url IS NOT NULL
  AND m.poster_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM movie_posters mp WHERE mp.movie_id = m.id
  );
