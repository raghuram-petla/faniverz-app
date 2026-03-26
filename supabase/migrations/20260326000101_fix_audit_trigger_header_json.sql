-- Fix: audit_trigger_fn reads x-admin-user-id from request.headers (JSON blob)
-- instead of request.header.x-admin-user-id (individual GUC).
--
-- PostgREST v12+ (used by Supabase) stores ALL headers as a single JSON object
-- in the request.headers GUC, not as individual request.header.* settings.
-- The previous trigger used the old individual-GUC syntax which always returned NULL.

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id  uuid;
  v_action   text;
  v_entity_id text;
  v_details  jsonb;
  v_imp_user_id uuid;
  v_imp_role    text;
  v_headers    jsonb;
BEGIN
  -- Resolve admin identity from (in priority order):
  --   1. app.admin_user_id (set by RPC functions like admin_crud, revert_audit_entry)
  --   2. x-admin-user-id HTTP header (set by getAuditableSupabaseAdmin via route wrappers)
  --   3. auth.uid() (set by authenticated Supabase client)
  v_user_id := NULLIF(current_setting('app.admin_user_id', true), '')::uuid;

  IF v_user_id IS NULL THEN
    -- Parse the JSON headers blob; PostgREST v12+ uses request.headers (not request.header.*)
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    IF v_headers IS NOT NULL THEN
      v_user_id := NULLIF(v_headers->>'x-admin-user-id', '')::uuid;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  -- Skip audit logging if no admin identity can be resolved (e.g. system/cron jobs)
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_imp_user_id := NULLIF(current_setting('app.impersonating_user_id', true), '')::uuid;
  v_imp_role    := NULLIF(current_setting('app.impersonating_role', true), '');

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity_id := (to_jsonb(NEW)->>'id');
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := (to_jsonb(NEW)->>'id');
    v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity_id := (to_jsonb(OLD)->>'id');
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_log (admin_user_id, action, entity_type, entity_id, details,
                         impersonating_user_id, impersonating_role)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, v_entity_id, v_details,
          v_imp_user_id, v_imp_role);

  RETURN COALESCE(NEW, OLD);
END;
$$;

NOTIFY pgrst, 'reload schema';
