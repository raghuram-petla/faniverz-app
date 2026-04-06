-- Editorial reviews: admin-written movie reviews with 5 craft ratings.
-- One editorial review per movie. Overall rating is the average of 5 craft ratings.

CREATE TABLE editorial_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  verdict text,
  rating_story integer NOT NULL CHECK (rating_story BETWEEN 1 AND 5),
  rating_direction integer NOT NULL CHECK (rating_direction BETWEEN 1 AND 5),
  rating_technical integer NOT NULL CHECK (rating_technical BETWEEN 1 AND 5),
  rating_music integer NOT NULL CHECK (rating_music BETWEEN 1 AND 5),
  rating_performances integer NOT NULL CHECK (rating_performances BETWEEN 1 AND 5),
  overall_rating numeric GENERATED ALWAYS AS (
    (rating_story + rating_direction + rating_technical + rating_music + rating_performances)::numeric / 5.0
  ) STORED,
  agree_count integer NOT NULL DEFAULT 0,
  disagree_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editorial_reviews_movie_unique UNIQUE (movie_id)
);

ALTER TABLE editorial_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published editorial reviews
CREATE POLICY "Anyone can read published editorial reviews"
  ON editorial_reviews FOR SELECT USING (is_published = true);

CREATE INDEX idx_editorial_reviews_movie ON editorial_reviews (movie_id) WHERE is_published = true;
CREATE INDEX idx_editorial_reviews_published ON editorial_reviews (published_at DESC) WHERE is_published = true;
