-- Security fixes: audit_trigger_fn search_path, notifications RLS,
-- delete_user_account search_path, personalized_feed anon grant

-- ============================================================
-- 1. Fix audit_trigger_fn: add SET search_path = ''
-- ============================================================
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
BEGIN
  v_user_id := COALESCE(
    current_setting('app.admin_user_id', true)::uuid,
    auth.uid()
  );

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

-- ============================================================
-- 2. Fix notifications RLS: restrict INSERT/UPDATE to admins or own user
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Admins or self can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can update notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Fix delete_user_account: SET search_path = '' with fully qualified refs
-- ============================================================
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  DELETE FROM public.review_helpful WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.watchlists WHERE user_id = target_user_id;
  DELETE FROM public.entity_follows WHERE user_id = target_user_id;
  DELETE FROM public.favorite_actors WHERE user_id = target_user_id;
  DELETE FROM public.feed_votes WHERE user_id = target_user_id;
  DELETE FROM public.feed_comments WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.push_tokens WHERE user_id = target_user_id;
  DELETE FROM public.user_activity WHERE user_id = target_user_id;
  DELETE FROM public.admin_user_roles WHERE user_id = target_user_id;
  DELETE FROM public.admin_ph_assignments WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;

-- ============================================================
-- 4. Remove anon grant from get_personalized_feed
-- ============================================================
REVOKE EXECUTE ON FUNCTION get_personalized_feed FROM anon;

NOTIFY pgrst, 'reload schema';
