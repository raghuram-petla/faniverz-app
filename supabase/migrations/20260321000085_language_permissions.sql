-- Language-scoped permissions: languages table, user_languages join table,
-- SQL helper functions, RLS policies, audit trigger.
-- Language scoping uses the existing movies.original_language text field (no new FK column).

-- ============================================================
-- 1. LANGUAGES TABLE — canonical list of supported content languages
-- ============================================================
CREATE TABLE languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read languages (public reference data)
CREATE POLICY "Anyone can read languages"
  ON languages FOR SELECT
  USING (true);

-- Only super_admin+ can mutate languages
CREATE POLICY "Super admins can insert languages"
  ON languages FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update languages"
  ON languages FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete languages"
  ON languages FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- 2. SEED LANGUAGES — Telugu, Tamil, Hindi
-- ============================================================
INSERT INTO languages (code, name) VALUES
  ('te', 'Telugu'),
  ('ta', 'Tamil'),
  ('hi', 'Hindi');

-- ============================================================
-- 3. USER_LANGUAGES JOIN TABLE — maps admin users to permitted languages
-- ============================================================
CREATE TABLE user_languages (
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  language_id uuid NOT NULL REFERENCES languages ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, language_id)
);

ALTER TABLE user_languages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_languages_user ON user_languages(user_id);

-- All admins can read language assignments (needed for AuthProvider)
CREATE POLICY "Admins can read user_languages"
  ON user_languages FOR SELECT
  USING (public.is_admin());

-- Only super_admin+ can manage language assignments
CREATE POLICY "Super admins can insert user_languages"
  ON user_languages FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update user_languages"
  ON user_languages FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete user_languages"
  ON user_languages FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- 4. SQL HELPER — returns language CODES for current admin user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_language_codes()
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(array_agg(l.code), '{}')
  FROM public.user_languages ul
  JOIN public.languages l ON l.id = ul.language_id
  WHERE ul.user_id = (SELECT auth.uid());
$$;

-- ============================================================
-- 5. ATOMIC REPLACE FUNCTION — delete-then-insert in a single transaction
-- ============================================================
CREATE OR REPLACE FUNCTION public.replace_user_languages(
  p_user_id uuid,
  p_language_ids uuid[],
  p_assigned_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_languages WHERE user_id = p_user_id;

  IF array_length(p_language_ids, 1) > 0 THEN
    INSERT INTO public.user_languages (user_id, language_id, assigned_by)
    SELECT p_user_id, unnest(p_language_ids), p_assigned_by;
  END IF;
END;
$$;

-- ============================================================
-- 6. AUDIT TRIGGER — track language assignment changes
-- ============================================================
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON user_languages
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================
-- 7. RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
