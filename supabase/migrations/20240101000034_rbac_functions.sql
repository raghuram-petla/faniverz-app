-- RBAC: Role-aware SQL helper functions
-- These replace/augment the original is_admin() function from 000013

-- ============================================================
-- Get current user's admin role (null if not admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role_id FROM public.admin_user_roles WHERE user_id = (SELECT auth.uid());
$$;

-- ============================================================
-- Check if current user is a super admin
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
    WHERE user_id = (SELECT auth.uid()) AND role_id = 'super_admin'
  );
$$;

-- ============================================================
-- Get production house IDs assigned to current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_ph_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(array_agg(production_house_id), '{}')
  FROM public.admin_ph_assignments
  WHERE user_id = (SELECT auth.uid());
$$;

-- NOTE: is_admin() replacement is deferred to 000036 (after seeding existing admins)
-- to avoid a chicken-and-egg lockout: if we replace is_admin() here, the
-- admin_user_roles table is still empty, so all admin checks would fail.

-- ============================================================
-- Now add the RLS policies that depend on is_super_admin()
-- (deferred from 000033 because the function didn't exist yet)
-- ============================================================

-- admin_user_roles: super admins can manage
CREATE POLICY "Super admins can manage user roles"
  ON admin_user_roles FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update user roles"
  ON admin_user_roles FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete user roles"
  ON admin_user_roles FOR DELETE
  USING (public.is_super_admin());

-- admin_ph_assignments: super admins can manage
CREATE POLICY "Super admins can manage PH assignments"
  ON admin_ph_assignments FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update PH assignments"
  ON admin_ph_assignments FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete PH assignments"
  ON admin_ph_assignments FOR DELETE
  USING (public.is_super_admin());

-- admin_invitations: super admins manage
CREATE POLICY "Super admins can view invitations"
  ON admin_invitations FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can create invitations"
  ON admin_invitations FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update invitations"
  ON admin_invitations FOR UPDATE
  USING (public.is_super_admin());

NOTIFY pgrst, 'reload schema';
