-- Audit log view: flattens admin email/name for display & search
-- security_invoker = true ensures RLS on audit_log and profiles is respected

CREATE VIEW audit_log_view
WITH (security_invoker = true)
AS
SELECT
  al.id,
  al.admin_user_id,
  al.action,
  al.entity_type,
  al.entity_id::text AS entity_id,
  al.details,
  al.created_at,
  p.email AS admin_email,
  p.display_name AS admin_display_name
FROM audit_log al
LEFT JOIN profiles p ON p.id = al.admin_user_id;

-- Indexes for common filter/sort patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
