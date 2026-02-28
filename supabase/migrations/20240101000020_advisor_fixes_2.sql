-- Supabase Advisor fixes (round 2)
--
-- Performance (2 remaining issues):
--   1. is_admin() function calls auth.uid() directly — PostgreSQL re-evaluates
--      it for every row that any is_admin()-gated policy checks.
--      Fix: wrap in (SELECT auth.uid()) so it is hoisted as an init plan.
--   2. storage.objects avatar policies call auth.uid() directly (same issue).

-- ============================================================
-- PERFORMANCE FIX 1 — is_admin() function
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
    false
  );
$$;

-- ============================================================
-- PERFORMANCE FIX 2 — storage.objects avatar policies
-- ============================================================

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
