-- Fix audit_trigger_fn: add SET search_path = '' with fully qualified table refs
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_details jsonb;
  v_user_id uuid;
  v_imp_user_id uuid;
  v_imp_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check for active impersonation session
  SELECT target_user_id, target_role INTO v_imp_user_id, v_imp_role
  FROM public.admin_impersonation_sessions
  WHERE real_user_id = v_user_id AND is_active = true;

  -- Map TG_OP to audit action
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
