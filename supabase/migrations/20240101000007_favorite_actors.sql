-- Favorite actors table: tracks which actors a user follows

CREATE TABLE favorite_actors (
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  actor_id uuid REFERENCES actors ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, actor_id)
);
