-- Add privacy settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_profile_public boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_watchlist_public boolean DEFAULT true;
