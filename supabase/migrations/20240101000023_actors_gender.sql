-- Add gender to actors table.
-- TMDB gender values: 0 = not set, 1 = female, 2 = male, 3 = non-binary.
-- Stored as a smallint to match TMDB's encoding; NULL means unknown.

ALTER TABLE actors ADD COLUMN gender smallint;
