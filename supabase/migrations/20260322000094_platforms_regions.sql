-- Add regions array to platforms — tracks which countries this platform serves.
-- Populated automatically during TMDB sync.

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS regions text[] DEFAULT '{}';
