-- Track which R2 bucket poster_url and backdrop_url belong to.
-- Needed because a backdrop image can be set as main poster (or vice versa),
-- and the URL resolution requires knowing the correct bucket.
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_image_type text DEFAULT 'poster'
  CHECK (poster_image_type IN ('poster', 'backdrop'));
ALTER TABLE movies ADD COLUMN IF NOT EXISTS backdrop_image_type text DEFAULT 'backdrop'
  CHECK (backdrop_image_type IN ('poster', 'backdrop'));
