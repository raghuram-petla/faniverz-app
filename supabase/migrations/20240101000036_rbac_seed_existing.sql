-- RBAC: Migrate existing is_admin=true users to super_admin role
-- and add trigger to keep profiles.is_admin in sync

-- ============================================================
-- 1. SEED EXISTING ADMINS AS SUPER_ADMIN
-- ============================================================
INSERT INTO admin_user_roles (user_id, role_id)
SELECT id, 'super_admin'
FROM profiles
WHERE is_admin = true
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. REPLACE is_admin() to check admin_user_roles instead of profiles.is_admin
-- Deferred from 000034 so existing admins are seeded first (avoids lockout)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_user_roles WHERE user_id = (SELECT auth.uid())
  );
$$;

-- ============================================================
-- 3. SYNC TRIGGER: keep profiles.is_admin in sync with admin_user_roles
-- When a role is assigned → set is_admin=true
-- When a role is removed → set is_admin=false
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_is_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET is_admin = true WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET is_admin = false WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER sync_admin_flag
  AFTER INSERT OR DELETE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION sync_is_admin_flag();

NOTIFY pgrst, 'reload schema';
