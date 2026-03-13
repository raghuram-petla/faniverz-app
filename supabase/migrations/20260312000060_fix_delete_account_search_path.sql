-- Fix delete_user_account RPC: use empty search_path with fully qualified table refs
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify the caller is authenticated and deleting their own account
  IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete user data in dependency order (fully qualified table names)
  DELETE FROM public.review_helpful WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.watchlist WHERE user_id = target_user_id;
  DELETE FROM public.movie_follows WHERE user_id = target_user_id;
  DELETE FROM public.actor_follows WHERE user_id = target_user_id;
  DELETE FROM public.favorite_actors WHERE user_id = target_user_id;
  DELETE FROM public.feed_votes WHERE user_id = target_user_id;
  DELETE FROM public.feed_comments WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.push_tokens WHERE user_id = target_user_id;
  DELETE FROM public.user_activity WHERE user_id = target_user_id;
  DELETE FROM public.admin_user_roles WHERE user_id = target_user_id;
  DELETE FROM public.admin_ph_assignments WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete the auth user (requires service_role, handled by SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;
