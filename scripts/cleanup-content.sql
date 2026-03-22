-- cleanup-content.sql
-- Deletes all content data (movies, actors, platforms, production houses, etc.).
-- Preserves: users (profiles), admin roles/invitations, languages, countries, push tokens.
--
-- Usage:
--   Local:  docker exec supabase_db_faniverz-app psql -U postgres -d postgres -f /dev/stdin < scripts/cleanup-content.sql
--   Prod:   psql "$DATABASE_URL" -f scripts/cleanup-content.sql
--
-- SAFE TO RUN MULTIPLE TIMES (all DELETEs are idempotent).

BEGIN;

-- ── 1. User-generated content that references movies/actors ──────────────────
-- These have FK constraints to movies/actors but also to profiles (which we keep),
-- so we delete the rows rather than relying on CASCADE.

DELETE FROM review_helpful;
DELETE FROM reviews;
DELETE FROM watchlists;
DELETE FROM favorite_actors;
DELETE FROM feed_comments;
DELETE FROM feed_votes;
DELETE FROM notifications;

-- entity_follows and user_activity reference movies/actors by UUID but have no FK
-- to those tables — delete rows that reference content entities, keep user follows.
DELETE FROM entity_follows WHERE entity_type IN ('movie', 'actor', 'production_house');
DELETE FROM user_activity WHERE entity_type IN ('movie', 'actor', 'production_house', 'feed_item');

-- ── 2. Movie child tables ────────────────────────────────────────────────────

DELETE FROM movie_cast;
DELETE FROM movie_images;
DELETE FROM movie_keywords;
DELETE FROM movie_platforms;
DELETE FROM movie_platform_availability;
DELETE FROM movie_production_houses;
DELETE FROM movie_theatrical_runs;
DELETE FROM movie_videos;
DELETE FROM news_feed;          -- feed items reference movies

-- ── 3. Top-level content tables ──────────────────────────────────────────────

DELETE FROM movies;
DELETE FROM actors;
DELETE FROM admin_ph_assignments;  -- references production_houses + profiles
DELETE FROM production_houses;
DELETE FROM platforms;
DELETE FROM surprise_content;

-- ── 4. Admin bookkeeping ─────────────────────────────────────────────────────

DELETE FROM admin_impersonation_sessions;
DELETE FROM sync_logs;
DELETE FROM audit_log;

COMMIT;

-- Print summary
SELECT 'Cleanup complete. Remaining rows:' AS status;
SELECT
  (SELECT count(*) FROM movies) AS movies,
  (SELECT count(*) FROM actors) AS actors,
  (SELECT count(*) FROM production_houses) AS production_houses,
  (SELECT count(*) FROM platforms) AS platforms,
  (SELECT count(*) FROM profiles) AS profiles,
  (SELECT count(*) FROM admin_user_roles) AS admin_roles;
