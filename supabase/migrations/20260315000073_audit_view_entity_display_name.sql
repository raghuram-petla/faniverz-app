-- Add entity_display_name to audit_log_view
-- Resolves human-readable names for entity types that only store foreign key IDs
-- (e.g. movie_theatrical_runs stores movie_id, not the movie title)

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
    WHEN al.entity_type = 'movie_theatrical_runs' THEN
      (SELECT m.title FROM movies m
       WHERE m.id = (COALESCE(al.details->'new', al.details->'old')->>'movie_id')::uuid)
    ELSE NULL
  END AS entity_display_name
FROM audit_log al
LEFT JOIN profiles p ON p.id = al.admin_user_id
LEFT JOIN profiles ip ON ip.id = al.impersonating_user_id
LEFT JOIN profiles rp ON rp.id = al.reverted_by;

GRANT SELECT ON audit_log_view TO authenticated;

NOTIFY pgrst, 'reload schema';
