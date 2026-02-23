-- Performance indexes for frequently queried columns

-- Movies: filter by release date (calendar views, sorting)
CREATE INDEX idx_movies_release_date ON movies (release_date);

-- Movies: filter by release type (theatrical/ott/upcoming tabs)
CREATE INDEX idx_movies_release_type ON movies (release_type);

-- Movies: lookup by TMDB ID (sync operations)
CREATE INDEX idx_movies_tmdb_id ON movies (tmdb_id);

-- Reviews: fetch reviews for a specific movie
CREATE INDEX idx_reviews_movie_id ON reviews (movie_id);

-- Reviews: fetch reviews by a specific user
CREATE INDEX idx_reviews_user_id ON reviews (user_id);

-- Watchlists: fetch user's watchlist filtered by status
CREATE INDEX idx_watchlists_user_id_status ON watchlists (user_id, status);

-- Notifications: fetch unread notifications for a user
CREATE INDEX idx_notifications_user_id_read ON notifications (user_id, read);

-- Notifications: process pending notifications by schedule time
CREATE INDEX idx_notifications_status_scheduled_for ON notifications (status, scheduled_for);

-- Movie cast: fetch cast list for a movie
CREATE INDEX idx_movie_cast_movie_id ON movie_cast (movie_id);
