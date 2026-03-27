-- Atomic replace function for production house admin assignments.
-- Mirrors replace_user_languages pattern: delete-then-insert in a single transaction.

CREATE OR REPLACE FUNCTION public.replace_user_ph_assignments(
  p_user_id uuid,
  p_production_house_ids uuid[],
  p_assigned_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.admin_ph_assignments WHERE user_id = p_user_id;

  IF array_length(p_production_house_ids, 1) > 0 THEN
    INSERT INTO public.admin_ph_assignments (user_id, production_house_id, assigned_by)
    SELECT p_user_id, unnest(p_production_house_ids), p_assigned_by;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
