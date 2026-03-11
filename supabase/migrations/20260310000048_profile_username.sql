-- Add username column to profiles
ALTER TABLE profiles
  ADD COLUMN username text UNIQUE;

-- Lowercase-only, alphanumeric + underscore, 3-20 chars
ALTER TABLE profiles
  ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,20}$');

-- Fast lookup index
CREATE INDEX idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;
