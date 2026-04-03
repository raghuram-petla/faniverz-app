-- Comments system overhaul: nesting (one-level), likes, reply counts, notifications

-- 1a. Add columns to feed_comments for nesting and engagement
ALTER TABLE feed_comments
  ADD COLUMN parent_comment_id uuid REFERENCES feed_comments(id) ON DELETE CASCADE DEFAULT NULL,
  ADD COLUMN like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN reply_count integer NOT NULL DEFAULT 0;

ALTER TABLE feed_comments
  ADD CONSTRAINT chk_no_self_parent CHECK (parent_comment_id IS NULL OR parent_comment_id != id);

CREATE INDEX idx_feed_comments_parent ON feed_comments (parent_comment_id, created_at);

-- 1b. Create comment_likes table
CREATE TABLE comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES feed_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes"
  ON comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own comment likes"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_comment_likes_comment ON comment_likes (comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes (user_id, comment_id);

-- 1c. Trigger: maintain like_count on feed_comments
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comment_like_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_like_count();

-- 1c. Trigger: maintain reply_count on parent comment
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE public.feed_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE public.feed_comments SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.parent_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comment_reply_count
  AFTER INSERT OR DELETE ON feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();

-- 1d. Notification schema updates: add new types and columns
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('release', 'watchlist', 'trending', 'reminder', 'comment_reply', 'comment_like'));

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES feed_comments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feed_item_id uuid REFERENCES news_feed(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid CONSTRAINT notifications_actor_user_id_fkey REFERENCES profiles(id) ON DELETE SET NULL;

-- 1e. Trigger: auto-create notification when someone replies to a comment
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_user_id uuid;
  v_replier_name text;
  v_feed_item_id uuid;
BEGIN
  -- Only fires for replies (parent_comment_id IS NOT NULL)
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get parent comment owner and feed_item_id
  SELECT user_id, feed_item_id INTO v_parent_user_id, v_feed_item_id
  FROM public.feed_comments WHERE id = NEW.parent_comment_id;

  -- Don't notify yourself
  IF v_parent_user_id IS NULL OR v_parent_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get replier display name
  SELECT COALESCE(display_name, 'Someone') INTO v_replier_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, comment_id, feed_item_id, actor_user_id, scheduled_for, status)
  VALUES (
    v_parent_user_id,
    'comment_reply',
    v_replier_name || ' replied to your comment',
    LEFT(NEW.body, 100),
    NEW.id,
    v_feed_item_id,
    NEW.user_id,
    now(),
    'pending'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_comment_reply
  AFTER INSERT ON feed_comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_comment_reply();

-- 1e. Trigger: auto-create notification when someone likes a comment
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_comment_user_id uuid;
  v_feed_item_id uuid;
  v_comment_body text;
  v_liker_name text;
BEGIN
  -- Get comment owner and body for notification message
  SELECT user_id, feed_item_id, body INTO v_comment_user_id, v_feed_item_id, v_comment_body
  FROM public.feed_comments WHERE id = NEW.comment_id;

  -- Don't notify yourself
  IF v_comment_user_id IS NULL OR v_comment_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker display name
  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, comment_id, feed_item_id, actor_user_id, scheduled_for, status)
  VALUES (
    v_comment_user_id,
    'comment_like',
    v_liker_name || ' liked your comment',
    LEFT(COALESCE(v_comment_body, ''), 100),
    NEW.comment_id,
    v_feed_item_id,
    NEW.user_id,
    now(),
    'pending'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_comment_like
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_like();

-- 1f. Update delete_user_account RPC to clean up comment_likes
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
  DELETE FROM public.watchlist WHERE user_id = target_user_id;
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

-- 1g. Expand user_activity action_type to include comment_like
ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_action_type_check;
ALTER TABLE user_activity ADD CONSTRAINT user_activity_action_type_check
  CHECK (action_type IN ('vote', 'follow', 'unfollow', 'comment', 'review', 'comment_like'));

-- Trigger: auto-log comment likes to user_activity
CREATE OR REPLACE FUNCTION log_comment_like_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, action_type, entity_type, entity_id, metadata)
  VALUES (NEW.user_id, 'comment_like', 'comment', NEW.comment_id::text, jsonb_build_object('comment_id', NEW.comment_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_comment_like_activity
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_like_activity();

NOTIFY pgrst, 'reload schema';
