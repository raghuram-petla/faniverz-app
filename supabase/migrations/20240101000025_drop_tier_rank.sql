-- Drop tier_rank from actors table.
-- Cast ordering now uses movie_cast.display_order (per-movie, from TMDB billing).

ALTER TABLE actors DROP COLUMN IF EXISTS tier_rank;
