-- Movies table: core entity for Telugu movie calendar

CREATE TABLE movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer UNIQUE,
  title text NOT NULL,
  poster_url text,
  backdrop_url text,
  release_date date NOT NULL,
  runtime integer,
  genres text[],
  certification text CHECK (certification IN ('U', 'UA', 'A')),
  trailer_url text,
  synopsis text,
  director text,
  release_type text NOT NULL CHECK (release_type IN ('theatrical', 'ott', 'upcoming')),
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  tmdb_last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
