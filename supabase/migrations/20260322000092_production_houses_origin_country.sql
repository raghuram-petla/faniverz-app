-- Add origin_country to production_houses to store TMDB's origin_country field.

ALTER TABLE production_houses ADD COLUMN IF NOT EXISTS origin_country text;
