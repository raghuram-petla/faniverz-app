-- Enhance audit_log_view to resolve human-readable display names for junction tables.
-- Previously, only movie_theatrical_runs was resolved. Junction tables like
-- movie_platform_availability, movie_platforms, movie_production_houses, movie_cast,
-- and user_languages only store FK UUIDs — the view now JOINs to get actual names.

DROP VIEW IF EXISTS audit_log_view;

CREATE VIEW audit_log_view
WITH (security_invoker = true)
AS
SELECT
  al.id,
  al.admin_user_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.details,
  al.created_at,
  p.email AS admin_email,
  p.display_name AS admin_display_name,
  al.impersonating_user_id,
  al.impersonating_role,
  ip.email AS impersonating_email,
  ip.display_name AS impersonating_display_name,
  al.reverted_at,
  al.reverted_by,
  rp.display_name AS reverted_by_display_name,
  rp.email AS reverted_by_email,
  CASE
    -- movie_theatrical_runs: resolve movie title from movie_id FK
    WHEN al.entity_type = 'movie_theatrical_runs' THEN
      (SELECT m.title FROM movies m
       WHERE m.id = (COALESCE(al.details->'new', al.details->'old')->>'movie_id')::uuid)

    -- movie_platform_availability: resolve platform name from platform_id FK
    WHEN al.entity_type = 'movie_platform_availability' THEN
      (SELECT pl.name FROM platforms pl
       WHERE pl.id = COALESCE(al.details->'new', al.details->'old')->>'platform_id')

    -- movie_platforms: resolve platform name from platform_id FK
    WHEN al.entity_type = 'movie_platforms' THEN
      (SELECT pl.name FROM platforms pl
       WHERE pl.id = COALESCE(al.details->'new', al.details->'old')->>'platform_id')

    -- movie_production_houses: resolve production house name from production_house_id FK
    WHEN al.entity_type = 'movie_production_houses' THEN
      (SELECT ph.name FROM production_houses ph
       WHERE ph.id = (COALESCE(al.details->'new', al.details->'old')->>'production_house_id')::uuid)

    -- movie_cast: resolve actor name from actor_id FK
    WHEN al.entity_type = 'movie_cast' THEN
      (SELECT a.name FROM actors a
       WHERE a.id = (COALESCE(al.details->'new', al.details->'old')->>'actor_id')::uuid)

    -- user_languages: resolve language name from language_id FK
    WHEN al.entity_type = 'user_languages' THEN
      (SELECT l.name FROM languages l
       WHERE l.id = (COALESCE(al.details->'new', al.details->'old')->>'language_id')::uuid)

    -- admin_user_roles: resolve user display name from user_id FK
    WHEN al.entity_type = 'admin_user_roles' THEN
      (SELECT COALESCE(pr.display_name, pr.email) FROM profiles pr
       WHERE pr.id = (COALESCE(al.details->'new', al.details->'old')->>'user_id')::uuid)

    -- admin_ph_assignments: resolve user display name from user_id FK
    WHEN al.entity_type = 'admin_ph_assignments' THEN
      (SELECT COALESCE(pr.display_name, pr.email) FROM profiles pr
       WHERE pr.id = (COALESCE(al.details->'new', al.details->'old')->>'user_id')::uuid)

    ELSE NULL
  END AS entity_display_name
FROM audit_log al
LEFT JOIN profiles p ON p.id = al.admin_user_id
LEFT JOIN profiles ip ON ip.id = al.impersonating_user_id
LEFT JOIN profiles rp ON rp.id = al.reverted_by;

GRANT SELECT ON audit_log_view TO authenticated;

NOTIFY pgrst, 'reload schema';
