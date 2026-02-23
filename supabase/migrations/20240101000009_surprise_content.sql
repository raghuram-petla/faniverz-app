-- Surprise content table: curated YouTube content (songs, short films, BTS, etc.)

CREATE TABLE surprise_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('song', 'short-film', 'bts', 'interview', 'trailer')),
  duration text,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
