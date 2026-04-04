-- =============================================================================
-- Faniverz — Seed Data
-- =============================================================================
-- Admin auto-assign trigger only. All content (movies, actors, OTT platforms,
-- feed items, surprise content) is populated via the admin panel.
-- Idempotent: uses CREATE OR REPLACE and ON CONFLICT DO NOTHING.
-- Run with: supabase db reset   (applies migrations then seed)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Admin auto-assign trigger
-- -----------------------------------------------------------------------------
-- Auto-assign super_admin to rams.sep5@gmail.com on first Google sign-in.
-- When the user signs in via Google, Supabase creates auth.users → triggers
-- handle_new_user → creates profiles row. This trigger then assigns the role.
CREATE OR REPLACE FUNCTION public.seed_auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email = 'rams.sep5@gmail.com' THEN
    INSERT INTO public.admin_user_roles (user_id, role_id)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_assign_admin ON public.profiles;
CREATE TRIGGER on_profile_assign_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_auto_assign_admin();

-- =============================================================================
-- Seed complete.
-- super_admin auto-assigned to rams.sep5@gmail.com on first sign-in
-- All content: use admin panel to populate
-- =============================================================================
