-- Replace static release_type with derived movie status.
-- Movie status is now computed: release_date > today → upcoming,
-- in_theaters = true → in theaters, has movie_platforms → streaming,
-- otherwise → released.

-- 1. Add in_theaters boolean
ALTER TABLE movies ADD COLUMN in_theaters boolean NOT NULL DEFAULT false;

-- 2. Migrate existing data
UPDATE movies SET in_theaters = true WHERE release_type = 'theatrical';

-- 3. Drop the release_type column (removes CHECK constraint + index automatically)
DROP INDEX IF EXISTS idx_movies_release_type;
ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_release_type_check;
ALTER TABLE movies DROP COLUMN release_type;
