-- Security Audit Run 2: Add authorization check to replace_user_languages
-- Previously: any authenticated user could modify any user's language assignments
-- Now: only admins (via is_admin()) can call this function

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
  -- @boundary: Only admin users can modify language assignments
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  DELETE FROM public.user_languages WHERE user_id = p_user_id;

  IF array_length(p_language_ids, 1) > 0 THEN
    INSERT INTO public.user_languages (user_id, language_id, assigned_by)
    SELECT p_user_id, unnest(p_language_ids), p_assigned_by;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
