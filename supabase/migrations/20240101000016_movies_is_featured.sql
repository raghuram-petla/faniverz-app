-- Add is_featured flag to movies for spotlight / hero carousel ordering
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
