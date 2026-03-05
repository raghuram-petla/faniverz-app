-- Super Admin Impersonation: session tracking + audit log enhancement
-- Allows super admins to impersonate any role/user for testing RBAC scoping

-- ============================================================
-- 1. IMPERSONATION SESSIONS TABLE
-- ============================================================
CREATE TABLE admin_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  target_user_id uuid REFERENCES profiles ON DELETE SET NULL,
  target_role text NOT NULL REFERENCES admin_roles,
  target_ph_ids uuid[] DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  is_active boolean DEFAULT true
);

-- Only one active session per user at a time
CREATE UNIQUE INDEX idx_impersonation_active
  ON admin_impersonation_sessions (real_user_id) WHERE is_active = true;

CREATE INDEX idx_impersonation_real_user
  ON admin_impersonation_sessions (real_user_id);

ALTER TABLE admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage impersonation sessions"
  ON admin_impersonation_sessions FOR ALL
  USING (public.is_super_admin());

-- ============================================================
-- 2. AUDIT LOG: ADD IMPERSONATION COLUMNS
-- ============================================================
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS impersonating_user_id uuid REFERENCES profiles,
  ADD COLUMN IF NOT EXISTS impersonating_role text;

-- ============================================================
-- 3. UPDATE AUDIT TRIGGER — check for active impersonation session
-- ============================================================
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_details jsonb;
  v_user_id uuid;
  v_imp_user_id uuid;
  v_imp_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check for active impersonation session
  SELECT target_user_id, target_role INTO v_imp_user_id, v_imp_role
  FROM public.admin_impersonation_sessions
  WHERE real_user_id = v_user_id AND is_active = true;

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

  INSERT INTO audit_log (admin_user_id, action, entity_type, entity_id, details,
                         impersonating_user_id, impersonating_role)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, v_entity_id, v_details,
          v_imp_user_id, v_imp_role);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. UPDATE AUDIT LOG VIEW — include impersonation info
-- ============================================================
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
  ip.display_name AS impersonating_display_name
FROM audit_log al
LEFT JOIN profiles p ON p.id = al.admin_user_id
LEFT JOIN profiles ip ON ip.id = al.impersonating_user_id;

GRANT SELECT ON audit_log_view TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
