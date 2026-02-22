-- Composite indexes for common query patterns

-- Calendar view: movies by release date + status
CREATE INDEX IF NOT EXISTS idx_movies_release_date_status
  ON movies (release_date, status)
  WHERE status != 'cancelled';

-- OTT releases by date
CREATE INDEX IF NOT EXISTS idx_ott_releases_date
  ON ott_releases (ott_release_date);

-- OTT releases by movie
CREATE INDEX IF NOT EXISTS idx_ott_releases_movie
  ON ott_releases (movie_id);

-- Reviews by movie + created_at (for recent sort)
CREATE INDEX IF NOT EXISTS idx_reviews_movie_created
  ON reviews (movie_id, created_at DESC);

-- Reviews by movie + rating (for sort by rating)
CREATE INDEX IF NOT EXISTS idx_reviews_movie_rating
  ON reviews (movie_id, rating DESC);

-- Watchlist by user (for watchlist screen)
CREATE INDEX IF NOT EXISTS idx_watchlists_user
  ON watchlists (user_id);

-- Notification queue: pending + scheduled
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON notification_queue (status, scheduled_for)
  WHERE status = 'pending';

-- Movie cast by movie + display order
CREATE INDEX IF NOT EXISTS idx_movie_cast_movie_order
  ON movie_cast (movie_id, display_order);

-- Movie search by title
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm
  ON movies USING gin (title gin_trgm_ops);

-- Push tokens by user + active
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active
  ON push_tokens (user_id)
  WHERE is_active = true;
