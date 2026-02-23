-- Reviews table: user reviews for movies

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text,
  contains_spoiler boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

-- Review helpful table: tracks which users marked a review as helpful

CREATE TABLE review_helpful (
  user_id uuid REFERENCES profiles ON DELETE CASCADE,
  review_id uuid REFERENCES reviews ON DELETE CASCADE,
  PRIMARY KEY (user_id, review_id)
);
