-- Admin Blocking Guards: self-block prevention, last-super-admin protection,
-- and server-side blocked_at timestamp.

-- ============================================================
-- 1. SERVER-SIDE blocked_at TRIGGER
-- Sets blocked_at = now() when status changes to 'blocked',
-- clears it when status changes back to 'active'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_blocked_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'blocked' AND (OLD.status IS DISTINCT FROM 'blocked') THEN
    NEW.blocked_at := now();
  ELSIF NEW.status = 'active' AND OLD.status = 'blocked' THEN
    NEW.blocked_at := NULL;
    NEW.blocked_by := NULL;
    NEW.blocked_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS set_blocked_at_trigger ON admin_user_roles;
CREATE TRIGGER set_blocked_at_trigger
  BEFORE UPDATE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION set_blocked_at();

-- ============================================================
-- 2. PREVENT BLOCKING THE LAST ACTIVE SUPER ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_last_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role_id = 'super_admin'
     AND OLD.status = 'active'
     AND NEW.status = 'blocked'
  THEN
    IF (
      SELECT count(*) FROM public.admin_user_roles
      WHERE role_id = 'super_admin' AND status = 'active' AND user_id != OLD.user_id
    ) = 0 THEN
      RAISE EXCEPTION 'Cannot block the last active super admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS guard_last_super_admin_trigger ON admin_user_roles;
CREATE TRIGGER guard_last_super_admin_trigger
  BEFORE UPDATE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION guard_last_super_admin();

-- ============================================================
-- 3. UPDATE RLS POLICY: PREVENT SELF-BLOCKING
-- Replace existing policy to add user_id != auth.uid() guard
-- ============================================================
DROP POLICY IF EXISTS "Admins can update user roles" ON admin_user_roles;

CREATE POLICY "Admins can update user roles"
  ON admin_user_roles FOR UPDATE
  USING (
    -- Cannot update your own row
    user_id != (SELECT auth.uid())
    AND (
      public.is_super_admin()
      OR (
        public.get_admin_role() = 'admin'
        AND role_id = 'production_house_admin'
      )
    )
  )
  WITH CHECK (
    user_id != (SELECT auth.uid())
    AND (
      public.is_super_admin()
      OR (
        public.get_admin_role() = 'admin'
        AND role_id = 'production_house_admin'
      )
    )
  );

NOTIFY pgrst, 'reload schema';
