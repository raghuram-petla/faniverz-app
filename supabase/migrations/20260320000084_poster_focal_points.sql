-- Add focal point columns for the main poster image.
-- Mirrors the existing backdrop_focus_x/y pattern.
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_focus_x numeric;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_focus_y numeric;
