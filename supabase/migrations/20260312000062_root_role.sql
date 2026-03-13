-- Root Role: highest privilege level above super_admin.
-- Only root can promote/demote/block super admins.
-- Root is SQL-only (not assignable via admin panel invite flow).

-- ============================================================
-- 1. INSERT ROOT ROLE
-- ============================================================
INSERT INTO admin_roles (id, label, description) VALUES
  ('root', 'Root', 'Highest privilege — can manage super admins')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. CREATE is_root() FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_root()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role_id = 'root'
      AND status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_root() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_root() TO authenticated;

-- ============================================================
-- 3. UPDATE is_super_admin() TO INCLUDE ROOT
-- Root inherits all super_admin powers.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role_id IN ('super_admin', 'root')
      AND status = 'active'
  );
$$;

-- ============================================================
-- 4. REPLACE RLS POLICIES ON admin_user_roles
-- Root can manage all roles (except self).
-- Super admin can manage admin + PH admin only (not super_admin/root).
-- Admin can manage PH admin only.
-- ============================================================

-- INSERT: only root can assign roles (including super_admin)
DROP POLICY IF EXISTS "Super admins can manage user roles" ON admin_user_roles;
CREATE POLICY "Root can insert user roles"
  ON admin_user_roles FOR INSERT
  WITH CHECK (public.is_root());

-- UPDATE: tiered access with self-block prevention
DROP POLICY IF EXISTS "Admins can update user roles" ON admin_user_roles;
CREATE POLICY "Admins can update user roles"
  ON admin_user_roles FOR UPDATE
  USING (
    user_id != (SELECT auth.uid())
    AND (
      -- Root can update any row
      public.is_root()
      -- Super admin can update admin + PH admin rows
      OR (
        public.get_admin_role() = 'super_admin'
        AND role_id NOT IN ('super_admin', 'root')
      )
      -- Admin can update PH admin rows
      OR (
        public.get_admin_role() = 'admin'
        AND role_id = 'production_house_admin'
      )
    )
  )
  WITH CHECK (
    user_id != (SELECT auth.uid())
    AND (
      public.is_root()
      OR (
        public.get_admin_role() = 'super_admin'
        AND role_id NOT IN ('super_admin', 'root')
      )
      OR (
        public.get_admin_role() = 'admin'
        AND role_id = 'production_house_admin'
      )
    )
  );

-- DELETE: only root can revoke roles
DROP POLICY IF EXISTS "Super admins can delete user roles" ON admin_user_roles;
CREATE POLICY "Root can delete user roles"
  ON admin_user_roles FOR DELETE
  USING (public.is_root());

-- ============================================================
-- 5. REPLACE RLS POLICIES ON admin_ph_assignments
-- Both root and super_admin can manage PH assignments.
-- ============================================================
DROP POLICY IF EXISTS "Super admins can manage PH assignments" ON admin_ph_assignments;
CREATE POLICY "Root or super admins can insert PH assignments"
  ON admin_ph_assignments FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update PH assignments" ON admin_ph_assignments;
CREATE POLICY "Root or super admins can update PH assignments"
  ON admin_ph_assignments FOR UPDATE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete PH assignments" ON admin_ph_assignments;
CREATE POLICY "Root or super admins can delete PH assignments"
  ON admin_ph_assignments FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- 6. REPLACE RLS POLICIES ON admin_invitations
-- Both root and super_admin can manage invitations.
-- ============================================================
DROP POLICY IF EXISTS "Super admins can view invitations" ON admin_invitations;
CREATE POLICY "Root or super admins can view invitations"
  ON admin_invitations FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can create invitations" ON admin_invitations;
CREATE POLICY "Root or super admins can create invitations"
  ON admin_invitations FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update invitations" ON admin_invitations;
CREATE POLICY "Root or super admins can update invitations"
  ON admin_invitations FOR UPDATE
  USING (public.is_super_admin());

-- ============================================================
-- 7. UPDATE GUARD TRIGGER: PROTECT LAST ROOT
-- Cannot block the last active root user.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_last_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'blocked' THEN
    -- Guard last root
    IF OLD.role_id = 'root' THEN
      IF (
        SELECT count(*) FROM public.admin_user_roles
        WHERE role_id = 'root' AND status = 'active' AND user_id != OLD.user_id
      ) = 0 THEN
        RAISE EXCEPTION 'Cannot block the last active root user';
      END IF;
    END IF;
    -- Guard last super admin
    IF OLD.role_id = 'super_admin' THEN
      IF (
        SELECT count(*) FROM public.admin_user_roles
        WHERE role_id = 'super_admin' AND status = 'active' AND user_id != OLD.user_id
      ) = 0 THEN
        RAISE EXCEPTION 'Cannot block the last active super admin';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

NOTIFY pgrst, 'reload schema';
