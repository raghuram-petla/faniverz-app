-- OTT releases (when a movie becomes available on each platform)
CREATE TABLE IF NOT EXISTS public.ott_releases (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  ott_release_date DATE,
  deep_link_url TEXT,
  is_exclusive BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('tmdb', 'manual')),
  UNIQUE(movie_id, platform_id)
);

-- Enable RLS
ALTER TABLE public.ott_releases ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ott_releases_movie_id ON public.ott_releases(movie_id);
CREATE INDEX IF NOT EXISTS idx_ott_releases_platform_id ON public.ott_releases(platform_id);
CREATE INDEX IF NOT EXISTS idx_ott_releases_date ON public.ott_releases(ott_release_date);
