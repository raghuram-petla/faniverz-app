-- Feed comments: users can comment on news feed items
CREATE TABLE feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid NOT NULL REFERENCES news_feed(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON feed_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON feed_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON feed_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_feed_comments_feed_item ON feed_comments (feed_item_id, created_at);
CREATE INDEX idx_feed_comments_user ON feed_comments (user_id);

-- Auto-increment/decrement comment_count on news_feed
CREATE OR REPLACE FUNCTION update_feed_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.news_feed SET comment_count = comment_count + 1 WHERE id = NEW.feed_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.news_feed SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.feed_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feed_comment_count
  AFTER INSERT OR DELETE ON feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_comment_count();

NOTIFY pgrst, 'reload schema';
