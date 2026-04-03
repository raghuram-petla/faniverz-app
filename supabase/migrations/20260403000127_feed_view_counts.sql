-- feed_views table (same pattern as feed_bookmarks)
CREATE TABLE IF NOT EXISTS feed_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid NOT NULL REFERENCES news_feed(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feed_item_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_views_user ON feed_views (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_views_item ON feed_views (feed_item_id);

-- RLS
ALTER TABLE feed_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own views" ON feed_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own views" ON feed_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: increment view_count on INSERT only (views are permanent, no DELETE trigger)
CREATE OR REPLACE FUNCTION update_feed_view_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE news_feed SET view_count = view_count + 1 WHERE id = NEW.feed_item_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feed_view_count
AFTER INSERT ON feed_views
FOR EACH ROW EXECUTE FUNCTION update_feed_view_count();

-- Batch RPC: insert views for multiple feed items at once
-- Uses SECURITY DEFINER so the function can insert into feed_views on behalf of the user
-- ON CONFLICT DO NOTHING ensures the trigger only fires for genuinely new views
CREATE OR REPLACE FUNCTION record_feed_views(p_feed_item_ids uuid[])
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.feed_views (feed_item_id, user_id)
  SELECT unnest(p_feed_item_ids), auth.uid()
  ON CONFLICT (feed_item_id, user_id) DO NOTHING;
END;
$$;
