-- Expand revert_audit_entry to support all audited tables.
-- Previously only 12 tables were in the allowlist; this adds the remaining 10:
--   admin-managed: news_feed, movie_keywords, movie_images, countries, languages,
--                  movie_platform_availability
--   RBAC: admin_roles, admin_user_roles, admin_ph_assignments, admin_invitations,
--         user_languages
-- Also removes stale entries: movie_posters (renamed to movie_images in 083),
-- movie_backdrops (dropped in 083).
-- Adds composite-key handling for tables without a simple `id` PK.

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

  -- Allowlist: all tables with audit triggers (except system tables)
  IF v_table NOT IN (
    'movies', 'actors', 'movie_cast', 'movie_videos',
    'movie_platforms', 'movie_theatrical_runs', 'platforms',
    'production_houses', 'movie_production_houses', 'notifications',
    'surprise_content',
    -- Newly added (movie_posters renamed to movie_images in 083, movie_backdrops dropped in 083):
    'news_feed', 'movie_keywords', 'movie_images',
    'countries', 'languages', 'movie_platform_availability',
    'admin_roles', 'admin_user_roles', 'admin_ph_assignments',
    'admin_invitations', 'user_languages'
  ) THEN
    RAISE EXCEPTION 'Cannot revert changes to table "%"', v_table;
  END IF;

  IF v_entry.action = 'update' THEN
    IF v_old IS NULL THEN RAISE EXCEPTION 'No old data available to revert'; END IF;

    v_sets := '';
    FOR v_key, v_value IN SELECT * FROM jsonb_each(v_old)
    LOOP
      IF v_key = 'id' OR v_key = ANY(v_skip) THEN CONTINUE; END IF;
      -- Skip PK column for countries (PK is `code`, not `id`)
      IF v_table = 'countries' AND v_key = 'code' THEN CONTINUE; END IF;
      IF v_sets != '' THEN v_sets := v_sets || ', '; END IF;
      v_sets := v_sets || format('%I = %s', v_key, public.jsonb_to_sql_literal(v_value));
    END LOOP;

    IF v_sets = '' THEN RAISE EXCEPTION 'No fields to revert'; END IF;

    -- Composite-key tables need special WHERE clauses
    IF v_table = 'movie_platforms' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE movie_id = %L AND platform_id = %L',
        v_table, v_sets, v_old->>'movie_id', v_old->>'platform_id');
    ELSIF v_table = 'movie_production_houses' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE movie_id = %L AND production_house_id = %L',
        v_table, v_sets, v_old->>'movie_id', v_old->>'production_house_id');
    ELSIF v_table = 'movie_keywords' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE movie_id = %L AND keyword_id = %s',
        v_table, v_sets, v_old->>'movie_id', (v_old->>'keyword_id')::integer);
    ELSIF v_table = 'admin_ph_assignments' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE user_id = %L AND production_house_id = %L',
        v_table, v_sets, v_old->>'user_id', v_old->>'production_house_id');
    ELSIF v_table = 'user_languages' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE user_id = %L AND language_id = %L',
        v_table, v_sets, v_old->>'user_id', v_old->>'language_id');
    ELSIF v_table = 'countries' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE code = %L',
        v_table, v_sets, v_old->>'code');
    ELSIF v_table = 'admin_roles' THEN
      EXECUTE format('UPDATE public.%I SET %s WHERE id = %L',
        v_table, v_sets, v_old->>'id');
    ELSE
      EXECUTE format('UPDATE public.%I SET %s WHERE id = %L',
        v_table, v_sets, v_entry.entity_id);
    END IF;

  ELSIF v_entry.action = 'create' THEN
    -- Composite-key deletes
    IF v_table = 'movie_platforms' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE movie_id = %L AND platform_id = %L',
        v_table, v_new->>'movie_id', v_new->>'platform_id');
    ELSIF v_table = 'movie_production_houses' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE movie_id = %L AND production_house_id = %L',
        v_table, v_new->>'movie_id', v_new->>'production_house_id');
    ELSIF v_table = 'movie_keywords' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE movie_id = %L AND keyword_id = %s',
        v_table, v_new->>'movie_id', (v_new->>'keyword_id')::integer);
    ELSIF v_table = 'admin_ph_assignments' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = %L AND production_house_id = %L',
        v_table, v_new->>'user_id', v_new->>'production_house_id');
    ELSIF v_table = 'user_languages' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = %L AND language_id = %L',
        v_table, v_new->>'user_id', v_new->>'language_id');
    ELSIF v_table = 'countries' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE code = %L',
        v_table, v_new->>'code');
    ELSIF v_table = 'admin_roles' AND v_new IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = %L',
        v_table, v_new->>'id');
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
