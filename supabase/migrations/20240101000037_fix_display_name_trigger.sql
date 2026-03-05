-- Fix handle_new_user trigger to extract display name from Google OAuth metadata.
-- Google provides 'full_name' and 'name', not 'display_name'.
-- Also backfills existing profiles that have email as display_name.

-- ============================================================
-- 1. FIX TRIGGER: check full_name, name, then display_name
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.email
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. BACKFILL: update existing profiles from auth.users metadata
-- ============================================================
UPDATE public.profiles p
SET
  display_name = COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'display_name',
    p.display_name
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    u.raw_user_meta_data ->> 'avatar_url'
  )
FROM auth.users u
WHERE p.id = u.id
  AND (p.display_name IS NULL OR p.display_name = p.email);
