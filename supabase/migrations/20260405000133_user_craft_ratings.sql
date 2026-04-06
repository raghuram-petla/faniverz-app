-- User craft ratings: users rate movies on 5 crafts inline from editorial review section.
-- Each craft is independently nullable — users can rate crafts incrementally.

CREATE TABLE user_craft_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating_story integer CHECK (rating_story BETWEEN 1 AND 5),
  rating_direction integer CHECK (rating_direction BETWEEN 1 AND 5),
  rating_technical integer CHECK (rating_technical BETWEEN 1 AND 5),
  rating_music integer CHECK (rating_music BETWEEN 1 AND 5),
  rating_performances integer CHECK (rating_performances BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_craft_ratings_unique UNIQUE (user_id, movie_id)
);

ALTER TABLE user_craft_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read craft ratings" ON user_craft_ratings FOR SELECT USING (true);
CREATE POLICY "Users insert own craft ratings" ON user_craft_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own craft ratings" ON user_craft_ratings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_craft_ratings_movie ON user_craft_ratings (movie_id);
