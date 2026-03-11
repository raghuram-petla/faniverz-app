-- User activity tracking table
CREATE TABLE user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('vote', 'follow', 'unfollow', 'comment', 'review')),
  entity_type text NOT NULL CHECK (entity_type IN ('movie', 'actor', 'production_house', 'feed_item', 'comment')),
  entity_id text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_activity_user_id ON user_activity (user_id, created_at DESC);
CREATE INDEX idx_user_activity_action_type ON user_activity (user_id, action_type, created_at DESC);

-- RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-log votes
CREATE OR REPLACE FUNCTION log_vote_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, action_type, entity_type, entity_id, metadata)
  VALUES (NEW.user_id, 'vote', 'feed_item', NEW.feed_item_id, jsonb_build_object('vote_type', NEW.vote_type));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_vote_activity
  AFTER INSERT ON feed_votes
  FOR EACH ROW EXECUTE FUNCTION log_vote_activity();

-- Trigger: auto-log follows
CREATE OR REPLACE FUNCTION log_follow_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, action_type, entity_type, entity_id)
  VALUES (NEW.user_id, 'follow', NEW.entity_type, NEW.entity_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_follow_activity
  AFTER INSERT ON entity_follows
  FOR EACH ROW EXECUTE FUNCTION log_follow_activity();

-- Trigger: auto-log unfollows
CREATE OR REPLACE FUNCTION log_unfollow_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, action_type, entity_type, entity_id)
  VALUES (OLD.user_id, 'unfollow', OLD.entity_type, OLD.entity_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_unfollow_activity
  AFTER DELETE ON entity_follows
  FOR EACH ROW EXECUTE FUNCTION log_unfollow_activity();

-- Trigger: auto-log comments
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, action_type, entity_type, entity_id, metadata)
  VALUES (NEW.user_id, 'comment', 'feed_item', NEW.feed_item_id, jsonb_build_object('comment_id', NEW.id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_log_comment_activity
  AFTER INSERT ON feed_comments
  FOR EACH ROW EXECUTE FUNCTION log_comment_activity();
