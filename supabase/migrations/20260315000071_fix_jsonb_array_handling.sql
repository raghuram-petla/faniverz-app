-- Generic admin CRUD function with audit attribution + jsonb-to-SQL helper.
-- Consolidates: 068 (revert_audit_entry), 070 (admin_crud), 071 (array fix).
-- revert_audit_entry is created separately in 072 (with revert tracking).

-- Helper: convert a jsonb value to a properly-formatted SQL literal for dynamic SQL
CREATE OR REPLACE FUNCTION jsonb_to_sql_literal(v_value jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF v_value IS NULL OR v_value = 'null'::jsonb THEN
    RETURN 'NULL';
  END IF;

  CASE jsonb_typeof(v_value)
    WHEN 'string' THEN
      RETURN format('%L', v_value #>> '{}');
    WHEN 'number' THEN
      RETURN v_value::text;
    WHEN 'boolean' THEN
      RETURN v_value::text;
    WHEN 'array' THEN
      -- Convert JSON array to PostgreSQL array literal: ["a","b"] → '{a,b}'::text[]
      RETURN format('%L', (
        SELECT array_agg(elem)::text
        FROM jsonb_array_elements_text(v_value) AS elem
      ));
    ELSE
      -- object or other: cast to text
      RETURN format('%L', v_value::text);
  END CASE;
END;
$$;

-- Recreate admin_crud with fixed array handling
CREATE OR REPLACE FUNCTION admin_crud(
  p_admin_id uuid,
  p_table text,
  p_operation text,
  p_data jsonb DEFAULT NULL,
  p_id text DEFAULT NULL,
  p_filters jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'movies', 'platforms', 'production_houses', 'actors', 'news_feed',
    'surprise_content', 'movie_cast', 'movie_videos', 'movie_posters',
    'movie_platforms', 'movie_production_houses', 'movie_theatrical_runs',
    'reviews', 'feed_comments'
  ];
  v_sql text;
  v_cols text;
  v_vals text;
  v_sets text;
  v_where text;
  v_key text;
  v_value jsonb;
  v_result jsonb;
BEGIN
  IF NOT (p_table = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Table "%" is not allowed', p_table;
  END IF;

  PERFORM set_config('app.admin_user_id', p_admin_id::text, true);

  -- Build WHERE clause
  v_where := '';
  IF p_id IS NOT NULL THEN
    v_where := format('WHERE id = %L', p_id);
  ELSIF p_filters IS NOT NULL THEN
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_filters)
    LOOP
      IF v_where = '' THEN v_where := 'WHERE ';
      ELSE v_where := v_where || ' AND ';
      END IF;
      v_where := v_where || format('%I = %s', v_key, public.jsonb_to_sql_literal(v_value));
    END LOOP;
  END IF;

  IF p_operation = 'update' THEN
    IF p_data IS NULL THEN RAISE EXCEPTION 'Data is required for update'; END IF;
    IF v_where = '' THEN RAISE EXCEPTION 'id or filters required for update'; END IF;

    v_sets := '';
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_data)
    LOOP
      IF v_sets != '' THEN v_sets := v_sets || ', '; END IF;
      v_sets := v_sets || format('%I = %s', v_key, public.jsonb_to_sql_literal(v_value));
    END LOOP;

    v_sql := format('UPDATE public.%I SET %s %s RETURNING to_jsonb(public.%I.*)',
      p_table, v_sets, v_where, p_table);
    EXECUTE v_sql INTO v_result;

  ELSIF p_operation = 'insert' THEN
    IF p_data IS NULL THEN RAISE EXCEPTION 'Data is required for insert'; END IF;

    v_cols := '';
    v_vals := '';
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_data)
    LOOP
      IF v_cols != '' THEN v_cols := v_cols || ', '; v_vals := v_vals || ', '; END IF;
      v_cols := v_cols || format('%I', v_key);
      v_vals := v_vals || public.jsonb_to_sql_literal(v_value);
    END LOOP;

    v_sql := format('INSERT INTO public.%I (%s) VALUES (%s) RETURNING to_jsonb(public.%I.*)',
      p_table, v_cols, v_vals, p_table);
    EXECUTE v_sql INTO v_result;

  ELSIF p_operation = 'delete' THEN
    IF v_where = '' THEN RAISE EXCEPTION 'id or filters required for delete'; END IF;
    v_sql := format('DELETE FROM public.%I %s', p_table, v_where);
    EXECUTE v_sql;
    v_result := '{"success": true}'::jsonb;

  ELSE
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Permissions: only authenticated users and service_role can call admin_crud
REVOKE ALL ON FUNCTION admin_crud(uuid, text, text, jsonb, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_crud(uuid, text, text, jsonb, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION admin_crud(uuid, text, text, jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_crud(uuid, text, text, jsonb, text, jsonb) TO service_role;

-- Clean up test function from development
DROP FUNCTION IF EXISTS test_header_check();

NOTIFY pgrst, 'reload schema';
