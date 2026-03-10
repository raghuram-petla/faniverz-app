-- Entity follows: polymorphic follow system for movies, actors, production houses, users
CREATE TABLE entity_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('movie', 'actor', 'production_house', 'user')),
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

-- RLS policies (user-isolated, same pattern as favorite_actors)
ALTER TABLE entity_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON entity_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
  ON entity_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
  ON entity_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for lookup performance
CREATE INDEX idx_entity_follows_user ON entity_follows (user_id);
CREATE INDEX idx_entity_follows_entity ON entity_follows (entity_type, entity_id);
