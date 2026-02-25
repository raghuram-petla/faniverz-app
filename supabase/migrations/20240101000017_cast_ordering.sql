-- Cast ordering: add tier ranking for actors and role ordering for crew
--
-- Tier rank reference (actors):
--   1 = Lead Actor / Hero (Protagonist)
--   2 = Lead Actress / Heroine
--   3 = Main Villain / Antagonist
--   4 = Supporting Lead (co-hero, character lead)
--   5 = Supporting Cast
--   6 = Cameo / Special Appearance
--
-- Role order reference (crew/technicians):
--   1 = Director
--   2 = Producer
--   3 = Music Director
--   4 = Director of Photography (DOP / Cinematographer)
--   5 = Editor
--   6 = Art Director / Production Designer
--   7 = Stunt Choreographer
--   8 = Choreographer
--   9 = Lyricist

-- ============================================================
-- Extend actors table
-- ============================================================
ALTER TABLE actors
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'actor'
    CHECK (person_type IN ('actor', 'technician'));

-- ============================================================
-- Extend movie_cast table
-- ============================================================
ALTER TABLE movie_cast
  ADD COLUMN IF NOT EXISTS credit_type text NOT NULL DEFAULT 'cast'
    CHECK (credit_type IN ('cast', 'crew')),
  ADD COLUMN IF NOT EXISTS tier_rank smallint,   -- actors only: 1–6 (lower = higher billing)
  ADD COLUMN IF NOT EXISTS role_order smallint;  -- crew only: 1=Director, 2=Producer, …

-- Index for efficient Cast tab queries (movie → credit_type → sort columns)
CREATE INDEX IF NOT EXISTS movie_cast_sort_idx
  ON movie_cast (movie_id, credit_type, tier_rank NULLS LAST, role_order NULLS LAST);
