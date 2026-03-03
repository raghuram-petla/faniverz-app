-- Production houses (companies) and their association with movies.
-- Individual producers (people) are tracked via movie_cast with credit_type='crew'.

-- ============================================================
-- PRODUCTION_HOUSES
-- ============================================================
CREATE TABLE production_houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- RLS: public read, admin write
ALTER TABLE production_houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Production houses are viewable by everyone"
  ON production_houses FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert production_houses"
  ON production_houses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update production_houses"
  ON production_houses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete production_houses"
  ON production_houses FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- MOVIE_PRODUCTION_HOUSES (junction table)
-- ============================================================
CREATE TABLE movie_production_houses (
  movie_id uuid NOT NULL REFERENCES movies ON DELETE CASCADE,
  production_house_id uuid NOT NULL REFERENCES production_houses ON DELETE CASCADE,
  PRIMARY KEY (movie_id, production_house_id)
);

-- RLS: public read, admin write
ALTER TABLE movie_production_houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie production houses are viewable by everyone"
  ON movie_production_houses FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movie_production_houses"
  ON movie_production_houses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update movie_production_houses"
  ON movie_production_houses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete movie_production_houses"
  ON movie_production_houses FOR DELETE
  USING (public.is_admin());
