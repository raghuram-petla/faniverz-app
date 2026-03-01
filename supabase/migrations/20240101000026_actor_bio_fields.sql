-- Add enriched bio fields to actors table.
-- biography and place_of_birth come from TMDB /person endpoint.
-- height_cm is manually entered via admin panel.

ALTER TABLE actors ADD COLUMN IF NOT EXISTS biography text;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS place_of_birth text;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS height_cm smallint;
