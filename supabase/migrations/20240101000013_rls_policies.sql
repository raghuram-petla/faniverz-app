-- Row Level Security policies for all tables
-- Convention: anon/authenticated can SELECT public data; mutations restricted to owners or admins

-- ============================================================
-- Helper: check if current user is an admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- MOVIES
-- ============================================================
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movies are viewable by everyone"
  ON movies FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movies"
  ON movies FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update movies"
  ON movies FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete movies"
  ON movies FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- ACTORS
-- ============================================================
ALTER TABLE actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actors are viewable by everyone"
  ON actors FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert actors"
  ON actors FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update actors"
  ON actors FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete actors"
  ON actors FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- MOVIE_CAST
-- ============================================================
ALTER TABLE movie_cast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie cast is viewable by everyone"
  ON movie_cast FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movie_cast"
  ON movie_cast FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update movie_cast"
  ON movie_cast FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete movie_cast"
  ON movie_cast FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- PLATFORMS
-- ============================================================
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platforms are viewable by everyone"
  ON platforms FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert platforms"
  ON platforms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update platforms"
  ON platforms FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete platforms"
  ON platforms FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- MOVIE_PLATFORMS
-- ============================================================
ALTER TABLE movie_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie platforms are viewable by everyone"
  ON movie_platforms FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movie_platforms"
  ON movie_platforms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update movie_platforms"
  ON movie_platforms FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete movie_platforms"
  ON movie_platforms FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- SURPRISE_CONTENT
-- ============================================================
ALTER TABLE surprise_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surprise content is viewable by everyone"
  ON surprise_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert surprise_content"
  ON surprise_content FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update surprise_content"
  ON surprise_content FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete surprise_content"
  ON surprise_content FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- REVIEW_HELPFUL
-- ============================================================
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review helpful votes are viewable by everyone"
  ON review_helpful FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own helpful votes"
  ON review_helpful FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own helpful votes"
  ON review_helpful FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- WATCHLISTS
-- ============================================================
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist"
  ON watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
  ON watchlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON watchlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PUSH_TOKENS
-- ============================================================
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- FAVORITE_ACTORS
-- ============================================================
ALTER TABLE favorite_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorite actors"
  ON favorite_actors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite actors"
  ON favorite_actors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite actors"
  ON favorite_actors FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update notifications"
  ON notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- AUDIT_LOG
-- ============================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SYNC_LOGS
-- ============================================================
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON sync_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
