-- Supabase Advisor fixes
--
-- Security (2 issues):
--   1. notifications INSERT policy used WITH CHECK (true) → any user could insert
--   2. notifications UPDATE policy used USING/WITH CHECK (true) → any user could update
--
-- Performance (~20 issues):
--   • auth_rls_initplan: policies calling auth.uid() directly cause PostgreSQL to
--     re-evaluate the function for every row. Wrapping in (SELECT auth.uid()) lets
--     PostgreSQL hoist it as a one-time init plan — significant speedup on large tables.
--   • Missing indexes on FK columns that have no supporting index.

-- ============================================================
-- SECURITY FIX 1 & 2 — notifications policies
-- ============================================================
-- Old: WITH CHECK (true) → any anon/authenticated user could insert or update
--      any notification for any user
-- New: restrict to admins (admin panel) only; service role bypasses RLS anyway

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can update notifications" ON notifications;

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- PERFORMANCE FIX — auth_rls_initplan
-- Wrap auth.uid() in (SELECT auth.uid()) so PostgreSQL executes it once
-- per query as an init plan rather than once per row.
-- ============================================================

-- PROFILES
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- REVIEWS
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

CREATE POLICY "Users can insert their own reviews"
  ON reviews FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- REVIEW_HELPFUL
DROP POLICY IF EXISTS "Users can insert their own helpful votes" ON review_helpful;
DROP POLICY IF EXISTS "Users can delete their own helpful votes" ON review_helpful;

CREATE POLICY "Users can insert their own helpful votes"
  ON review_helpful FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own helpful votes"
  ON review_helpful FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- WATCHLISTS
DROP POLICY IF EXISTS "Users can view their own watchlist" ON watchlists;
DROP POLICY IF EXISTS "Users can insert into their own watchlist" ON watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlist" ON watchlists;
DROP POLICY IF EXISTS "Users can delete from their own watchlist" ON watchlists;

CREATE POLICY "Users can view their own watchlist"
  ON watchlists FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert into their own watchlist"
  ON watchlists FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own watchlist"
  ON watchlists FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON watchlists FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- PUSH_TOKENS
DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON push_tokens;

CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- FAVORITE_ACTORS
DROP POLICY IF EXISTS "Users can view their own favorite actors" ON favorite_actors;
DROP POLICY IF EXISTS "Users can insert their own favorite actors" ON favorite_actors;
DROP POLICY IF EXISTS "Users can delete their own favorite actors" ON favorite_actors;

CREATE POLICY "Users can view their own favorite actors"
  ON favorite_actors FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own favorite actors"
  ON favorite_actors FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own favorite actors"
  ON favorite_actors FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- NOTIFICATIONS (SELECT)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- AUDIT_LOG (fix: force admin_user_id = current user on insert)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_log;

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND admin_user_id = (SELECT auth.uid())
  );

-- ============================================================
-- PERFORMANCE FIX — missing FK indexes
-- ============================================================

-- movie_cast: queries like "find all movies for this actor" need actor_id index
CREATE INDEX IF NOT EXISTS idx_movie_cast_actor_id
  ON movie_cast (actor_id);

-- movie_platforms: queries like "find all movies on Netflix" need platform_id index
CREATE INDEX IF NOT EXISTS idx_movie_platforms_platform_id
  ON movie_platforms (platform_id);

-- watchlists: cascade delete from movies needs movie_id index
CREATE INDEX IF NOT EXISTS idx_watchlists_movie_id
  ON watchlists (movie_id);

-- favorite_actors: queries like "find all fans of this actor" need actor_id index
CREATE INDEX IF NOT EXISTS idx_favorite_actors_actor_id
  ON favorite_actors (actor_id);

-- notifications: cascade delete from movies + "notifications for this movie"
CREATE INDEX IF NOT EXISTS idx_notifications_movie_id
  ON notifications (movie_id);

-- audit_log: queries by admin user
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user_id
  ON audit_log (admin_user_id);
