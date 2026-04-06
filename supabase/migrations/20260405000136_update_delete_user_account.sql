-- Update delete_user_account RPC to clean up new editorial tables
-- and fix missing deletions for feed_bookmarks, feed_views, entity_follows.

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

  DELETE FROM public.editorial_review_polls WHERE user_id = target_user_id;
  DELETE FROM public.user_craft_ratings WHERE user_id = target_user_id;
  DELETE FROM public.feed_bookmarks WHERE user_id = target_user_id;
  DELETE FROM public.feed_views WHERE user_id = target_user_id;
  DELETE FROM public.entity_follows WHERE user_id = target_user_id;
  DELETE FROM public.review_helpful WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.watchlists WHERE user_id = target_user_id;
  DELETE FROM public.movie_follows WHERE user_id = target_user_id;
  DELETE FROM public.actor_follows WHERE user_id = target_user_id;
  DELETE FROM public.favorite_actors WHERE user_id = target_user_id;
  DELETE FROM public.feed_votes WHERE user_id = target_user_id;
  DELETE FROM public.comment_likes WHERE user_id = target_user_id;
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
