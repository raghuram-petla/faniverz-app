-- Fix 1: Clear runtime=0
-- TMDB returns 0 for movies with unknown runtime. Our app validation rejects 0
-- as an invalid runtime value, causing validation errors when admins edit those movies.
UPDATE movies SET runtime = NULL WHERE runtime = 0;

-- Fix 2: Backfill movie_posters for movies imported after migration 077.
-- Migration 077 backfilled all movies that existed at the time it ran, but movies
-- imported via TMDB sync after that date have no gallery entry. This catches them all.
-- Identical WHERE logic to 077 — safe to re-run; NOT EXISTS prevents double-insert.
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
