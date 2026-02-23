-- Platforms table: OTT streaming platforms

CREATE TABLE platforms (
  id text PRIMARY KEY,
  name text NOT NULL,
  logo text NOT NULL,
  color text NOT NULL,
  display_order integer DEFAULT 0
);

-- Movie-platform junction table

CREATE TABLE movie_platforms (
  movie_id uuid REFERENCES movies ON DELETE CASCADE,
  platform_id text REFERENCES platforms ON DELETE CASCADE,
  PRIMARY KEY (movie_id, platform_id)
);
