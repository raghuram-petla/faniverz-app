-- Backfill future-dated published_at to now()
--
-- Any news_feed row with published_at > now() was set that way because an admin
-- entered a future poster_date or video_date. These items should be visible
-- immediately, not held until that future date.
UPDATE news_feed
SET published_at = now()
WHERE published_at > now();
