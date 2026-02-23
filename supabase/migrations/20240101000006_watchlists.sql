-- Watchlists table: user watchlist and watched tracking

CREATE TABLE watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watched')),
  added_at timestamptz DEFAULT now(),
  watched_at timestamptz,
  UNIQUE (user_id, movie_id)
);
