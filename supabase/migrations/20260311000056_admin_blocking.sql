-- Admin Blocking: Add status/blocked fields to admin_user_roles
-- Allows super_admins to block any admin/PH admin, and regular admins to block PH admins.
-- Blocking preserves the role assignment (unlike revocation) and is reversible.

-- ============================================================
-- 1. ADD BLOCKING COLUMNS TO admin_user_roles
-- ============================================================
ALTER TABLE admin_user_roles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'blocked')),
  ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES profiles,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

-- ============================================================
-- 2. UPDATE SQL FUNCTIONS TO EXCLUDE BLOCKED USERS
-- ============================================================

-- is_admin(): only active admins count
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = (SELECT auth.uid()) AND status = 'active'
  );
$$;

-- get_admin_role(): return null for blocked users
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role_id FROM public.admin_user_roles
  WHERE user_id = (SELECT auth.uid()) AND status = 'active';
$$;

-- is_super_admin(): only active super admins
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
      AND role_id = 'super_admin'
      AND status = 'active'
  );
$$;

-- ============================================================
-- 3. UPDATE SYNC TRIGGER TO HANDLE BLOCKING
-- ============================================================
-- When status changes to 'blocked', set is_admin=false
-- When status changes to 'active', set is_admin=true
CREATE OR REPLACE FUNCTION public.sync_is_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET is_admin = (NEW.status = 'active') WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET is_admin = false WHERE id = OLD.user_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.profiles SET is_admin = (NEW.status = 'active') WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop and recreate trigger to include UPDATE
DROP TRIGGER IF EXISTS sync_admin_flag ON admin_user_roles;
CREATE TRIGGER sync_admin_flag
  AFTER INSERT OR UPDATE OR DELETE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION sync_is_admin_flag();

-- ============================================================
-- 4. UPDATE RLS POLICIES FOR admin_user_roles
-- Allow regular admins to UPDATE PH admin rows (for blocking)
-- ============================================================

-- Drop existing super-admin-only update policy
DROP POLICY IF EXISTS "Super admins can update user roles" ON admin_user_roles;

-- New policy: super admins can update any row; admins can update PH admin rows
CREATE POLICY "Admins can update user roles"
  ON admin_user_roles FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      public.get_admin_role() = 'admin'
      AND role_id = 'production_house_admin'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.get_admin_role() = 'admin'
      AND role_id = 'production_house_admin'
    )
  );

-- ============================================================
-- 5. INDEX FOR STATUS FILTERING
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_status ON admin_user_roles(status);

NOTIFY pgrst, 'reload schema';
