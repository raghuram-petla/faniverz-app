-- Automatic audit logging via database triggers
-- Replaces manual client-side logAudit() calls — catches ALL changes in one place

-- 1. Drop view first (depends on entity_id column)
DROP VIEW IF EXISTS audit_log_view;

-- 2. Alter entity_id from uuid to text for flexibility (composite keys, non-UUID IDs)
ALTER TABLE audit_log ALTER COLUMN entity_id TYPE text;

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
  p.display_name AS admin_display_name
FROM audit_log al
LEFT JOIN profiles p ON p.id = al.admin_user_id;

GRANT SELECT ON audit_log_view TO authenticated, anon;

-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_details jsonb;
  v_user_id uuid;
BEGIN
  -- Only log actions by authenticated users (skip service-role / system ops like TMDB sync)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Map TG_OP to audit action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity_id := (to_jsonb(NEW)->>'id');
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := (to_jsonb(NEW)->>'id');
    v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity_id := (to_jsonb(OLD)->>'id');
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO audit_log (admin_user_id, action, entity_type, entity_id, details)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, v_entity_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach triggers to all admin-managed tables
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON actors
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_cast
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_posters
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_videos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_platforms
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_theatrical_runs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON platforms
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON production_houses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_production_houses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON surprise_content
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
