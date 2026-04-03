-- Add bookmark_count column to news_feed
ALTER TABLE news_feed ADD COLUMN IF NOT EXISTS bookmark_count integer NOT NULL DEFAULT 0;

-- Create feed_bookmarks table (same pattern as feed_votes)
CREATE TABLE IF NOT EXISTS feed_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid NOT NULL REFERENCES news_feed(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feed_item_id, user_id)
);

-- Indexes: user lookups (paginated bookmarked feed) and item lookups (count trigger)
CREATE INDEX IF NOT EXISTS idx_feed_bookmarks_user ON feed_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_bookmarks_item ON feed_bookmarks (feed_item_id);

-- RLS: users can only CRUD their own bookmarks
ALTER TABLE feed_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks" ON feed_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON feed_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON feed_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger function: maintain news_feed.bookmark_count on insert/delete
-- (same pattern as update_feed_vote_counts in personalized_feed migration)
CREATE OR REPLACE FUNCTION update_feed_bookmark_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE news_feed SET bookmark_count = bookmark_count + 1 WHERE id = NEW.feed_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE news_feed SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = OLD.feed_item_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feed_bookmark_count
AFTER INSERT OR DELETE ON feed_bookmarks
FOR EACH ROW EXECUTE FUNCTION update_feed_bookmark_count();
