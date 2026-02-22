-- OTT streaming platforms (seeded with Telugu-relevant platforms)
CREATE TABLE IF NOT EXISTS public.platforms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  base_deep_link TEXT,
  color TEXT NOT NULL DEFAULT '#000000',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

-- Seed data
INSERT INTO public.platforms (name, slug, logo_url, base_deep_link, color, display_order) VALUES
  ('Aha', 'aha', NULL, 'https://www.aha.video', '#FF4B00', 1),
  ('Netflix', 'netflix', NULL, 'https://www.netflix.com', '#E50914', 2),
  ('Amazon Prime Video', 'prime-video', NULL, 'https://www.primevideo.com', '#00A8E1', 3),
  ('Disney+ Hotstar', 'hotstar', NULL, 'https://www.hotstar.com', '#0C2E65', 4),
  ('ZEE5', 'zee5', NULL, 'https://www.zee5.com', '#8230C6', 5),
  ('SunNXT', 'sunnxt', NULL, 'https://www.sunnxt.com', '#FF6600', 6),
  ('SonyLIV', 'sonyliv', NULL, 'https://www.sonyliv.com', '#00204E', 7),
  ('ETV Win', 'etvwin', NULL, 'https://www.etvwin.com', '#1E88E5', 8);
