-- RPC function to delete a user's account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete user data in dependency order
  DELETE FROM review_helpful WHERE user_id = target_user_id;
  DELETE FROM reviews WHERE user_id = target_user_id;
  DELETE FROM watchlist WHERE user_id = target_user_id;
  DELETE FROM movie_follows WHERE user_id = target_user_id;
  DELETE FROM actor_follows WHERE user_id = target_user_id;
  DELETE FROM favorite_actors WHERE user_id = target_user_id;
  DELETE FROM feed_votes WHERE user_id = target_user_id;
  DELETE FROM feed_comments WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM push_tokens WHERE user_id = target_user_id;
  DELETE FROM user_activity WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;

  -- Delete the auth user (requires service_role, handled by SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
