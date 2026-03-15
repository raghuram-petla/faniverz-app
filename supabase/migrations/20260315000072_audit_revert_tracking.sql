-- Track revert status on audit log entries:
-- - reverted_at: when the entry was reverted
-- - reverted_by: which admin reverted it
-- - reverted_audit_id: the audit entry ID that represents the revert action
-- Prevents double-reverting at the DB level.

-- 1. Add columns to audit_log
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reverted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reverted_audit_id uuid REFERENCES audit_log(id) ON DELETE SET NULL;

-- 2. Recreate view to include revert info + reverter's name
DROP VIEW IF EXISTS audit_log_view;

CREATE VIEW audit_log_view
WITH (security_invoker = true)
AS
SELECT
  al.id,
  al.admin_user_id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.details,
  al.created_at,
  p.email AS admin_email,
  p.display_name AS admin_display_name,
  al.impersonating_user_id,
  al.impersonating_role,
  ip.email AS impersonating_email,
  ip.display_name AS impersonating_display_name,
  al.reverted_at,
  al.reverted_by,
  rp.display_name AS reverted_by_display_name,
  rp.email AS reverted_by_email
FROM audit_log al
LEFT JOIN profiles p ON p.id = al.admin_user_id
LEFT JOIN profiles ip ON ip.id = al.impersonating_user_id
LEFT JOIN profiles rp ON rp.id = al.reverted_by;

GRANT SELECT ON audit_log_view TO authenticated, anon;

-- 3. Update revert_audit_entry to mark entries as reverted and prevent double-revert
CREATE OR REPLACE FUNCTION revert_audit_entry(
  p_admin_id uuid,
  p_entry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry  record;
  v_old    jsonb;
  v_new    jsonb;
  v_table  text;
  v_cols   text;
  v_vals   text;
  v_sets   text;
  v_key    text;
  v_value  jsonb;
  v_skip   text[] := ARRAY['created_at', 'updated_at'];
  v_new_audit_id uuid;
BEGIN
  PERFORM set_config('app.admin_user_id', p_admin_id::text, true);

  SELECT * INTO v_entry FROM public.audit_log WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit entry not found'; END IF;

  -- Prevent double-revert
  IF v_entry.reverted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This change has already been reverted';
  END IF;

  v_table := v_entry.entity_type;
  v_old   := v_entry.details->'old';
  v_new   := v_entry.details->'new';

  IF v_table NOT IN (
    'movies', 'actors', 'movie_cast', 'movie_posters', 'movie_videos',
    'movie_platforms', 'movie_theatrical_runs', 'platforms',
    'production_houses', 'movie_production_houses', 'notifications',
    'surprise_content'
  ) THEN
    RAISE EXCEPTION 'Cannot revert changes to table "%"', v_table;
  END IF;

  IF v_entry.action = 'update' THEN
    IF v_old IS NULL THEN RAISE EXCEPTION 'No old data available to revert'; END IF;

    v_sets := '';
    FOR v_key, v_value IN SELECT * FROM jsonb_each(v_old)
    LOOP
      IF v_key = 'id' OR v_key = ANY(v_skip) THEN CONTINUE; END IF;
      IF v_sets != '' THEN v_sets := v_sets || ', '; END IF;
      v_sets := v_sets || format('%I = %s', v_key, public.jsonb_to_sql_literal(v_value));
    END LOOP;

    IF v_sets = '' THEN RAISE EXCEPTION 'No fields to revert'; END IF;

    IF v_table = 'movie_platforms' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE movie_id = %L AND platform_id = %L',
        v_table, v_sets, v_old->>'movie_id', v_old->>'platform_id');
    ELSIF v_table = 'movie_production_houses' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE movie_id = %L AND production_house_id = %L',
        v_table, v_sets, v_old->>'movie_id', v_old->>'production_house_id');
    ELSE
      EXECUTE format('UPDATE public.%I SET %s WHERE id = %L',
        v_table, v_sets, v_entry.entity_id);
    END IF;

  ELSIF v_entry.action = 'create' THEN
    IF v_table = 'movie_platforms' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE movie_id = %L AND platform_id = %L',
        v_table, v_new->>'movie_id', v_new->>'platform_id');
    ELSIF v_table = 'movie_production_houses' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE movie_id = %L AND production_house_id = %L',
        v_table, v_new->>'movie_id', v_new->>'production_house_id');
    ELSE
      EXECUTE format('DELETE FROM public.%I WHERE id = %L', v_table, v_entry.entity_id);
    END IF;

  ELSIF v_entry.action = 'delete' THEN
    IF v_old IS NULL THEN RAISE EXCEPTION 'No old data available to restore'; END IF;

    v_cols := '';
    v_vals := '';
    FOR v_key, v_value IN SELECT * FROM jsonb_each(v_old)
    LOOP
      IF v_key = ANY(v_skip) THEN CONTINUE; END IF;
      IF v_cols != '' THEN v_cols := v_cols || ', '; v_vals := v_vals || ', '; END IF;
      v_cols := v_cols || format('%I', v_key);
      v_vals := v_vals || public.jsonb_to_sql_literal(v_value);
    END LOOP;

    EXECUTE format('INSERT INTO public.%I (%s) VALUES (%s)', v_table, v_cols, v_vals);

  ELSE
    RAISE EXCEPTION 'Cannot revert action type "%"', v_entry.action;
  END IF;

  -- Find the audit entry that was just created by the trigger (the revert action)
  SELECT id INTO v_new_audit_id
  FROM public.audit_log
  WHERE admin_user_id = p_admin_id
    AND entity_type = v_table
    AND entity_id = v_entry.entity_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Mark the original entry as reverted
  UPDATE public.audit_log
  SET reverted_at = now(),
      reverted_by = p_admin_id,
      reverted_audit_id = v_new_audit_id
  WHERE id = p_entry_id;

  RETURN jsonb_build_object('success', true, 'action', v_entry.action, 'entity_type', v_table);
END;
$$;

NOTIFY pgrst, 'reload schema';
