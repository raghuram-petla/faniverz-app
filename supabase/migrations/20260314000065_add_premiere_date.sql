-- Add premiere_date to movies for premiere shows (typically the evening before release)
ALTER TABLE movies ADD COLUMN premiere_date date;

-- Index for cron job that checks premiere_date = today
CREATE INDEX idx_movies_premiere_date ON movies (premiere_date) WHERE premiere_date IS NOT NULL;
