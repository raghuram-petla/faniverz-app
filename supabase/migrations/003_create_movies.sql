-- Movies table (TMDB + curated)
CREATE TABLE IF NOT EXISTS public.movies (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  title_te TEXT,
  original_title TEXT,
  overview TEXT,
  overview_te TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date DATE,
  runtime INTEGER,
  genres TEXT[] NOT NULL DEFAULT '{}',
  certification TEXT,
  vote_average NUMERIC(3,1) NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  popularity NUMERIC NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'movie' CHECK (content_type IN ('movie', 'series')),
  release_type TEXT NOT NULL DEFAULT 'theatrical' CHECK (release_type IN ('theatrical', 'ott_original')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'released', 'postponed', 'cancelled')),
  trailer_youtube_key TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  tmdb_last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON public.movies(release_date);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON public.movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_status ON public.movies(status);
CREATE INDEX IF NOT EXISTS idx_movies_release_type ON public.movies(release_type);
CREATE INDEX IF NOT EXISTS idx_movies_is_featured ON public.movies(is_featured) WHERE is_featured = true;

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER movies_updated_at
  BEFORE UPDATE ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
