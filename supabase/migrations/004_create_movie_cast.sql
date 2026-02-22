-- Movie cast/crew table
CREATE TABLE IF NOT EXISTS public.movie_cast (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  tmdb_person_id INTEGER,
  name TEXT NOT NULL,
  name_te TEXT,
  character TEXT,
  role TEXT NOT NULL DEFAULT 'actor' CHECK (role IN ('actor', 'director', 'producer', 'music_director', 'cinematographer', 'writer')),
  profile_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.movie_cast ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_movie_cast_movie_id ON public.movie_cast(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_cast_tmdb_person_id ON public.movie_cast(tmdb_person_id);
