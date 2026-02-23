-- Actors table: stores actor/crew information

CREATE TABLE actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_person_id integer UNIQUE,
  name text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Movie cast table: maps actors to movies with role info

CREATE TABLE movie_cast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES actors ON DELETE CASCADE,
  role_name text,
  display_order integer DEFAULT 0
);
