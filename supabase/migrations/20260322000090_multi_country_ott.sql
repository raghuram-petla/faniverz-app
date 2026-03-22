-- Multi-country OTT availability support.
-- Replaces flat movie_platforms with country-aware, availability-type-aware table.

-- ── 1. Countries reference table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  display_order integer DEFAULT 999
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select" ON countries FOR SELECT USING (true);
CREATE POLICY "countries_admin_insert" ON countries FOR INSERT
  WITH CHECK (get_admin_role() = ANY (ARRAY['super_admin', 'admin']));
CREATE POLICY "countries_admin_update" ON countries FOR UPDATE
  USING (get_admin_role() = ANY (ARRAY['super_admin', 'admin']));
CREATE POLICY "countries_admin_delete" ON countries FOR DELETE
  USING (get_admin_role() = ANY (ARRAY['super_admin', 'admin']));

-- Seed priority countries
INSERT INTO countries (code, name, display_order) VALUES
  ('IN', 'India', 1),
  ('US', 'United States', 2),
  ('GB', 'United Kingdom', 3),
  ('CA', 'Canada', 4),
  ('AU', 'Australia', 5),
  ('DE', 'Germany', 6),
  ('FR', 'France', 7),
  ('JP', 'Japan', 8),
  ('BR', 'Brazil', 9),
  ('AE', 'United Arab Emirates', 10)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Availability type enum ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE availability_type AS ENUM ('flatrate', 'rent', 'buy', 'ads', 'free');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Movie platform availability table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS movie_platform_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code),
  availability_type availability_type NOT NULL DEFAULT 'flatrate',
  available_from date,
  streaming_url text,
  tmdb_display_priority integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (movie_id, platform_id, country_code, availability_type)
);

CREATE INDEX IF NOT EXISTS idx_mpa_movie_country
  ON movie_platform_availability(movie_id, country_code);
CREATE INDEX IF NOT EXISTS idx_mpa_platform
  ON movie_platform_availability(platform_id);

-- ── 4. RLS (same pattern as movie_platforms) ─────────────────────────────────

ALTER TABLE movie_platform_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpa_select" ON movie_platform_availability
  FOR SELECT USING (true);

CREATE POLICY "mpa_insert" ON movie_platform_availability
  FOR INSERT WITH CHECK (
    get_admin_role() = ANY (ARRAY['super_admin', 'admin'])
    OR (
      get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM movie_production_houses mph
        JOIN admin_ph_assignments apa ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_platform_availability.movie_id
          AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "mpa_update" ON movie_platform_availability
  FOR UPDATE USING (
    get_admin_role() = ANY (ARRAY['super_admin', 'admin'])
    OR (
      get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM movie_production_houses mph
        JOIN admin_ph_assignments apa ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_platform_availability.movie_id
          AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "mpa_delete" ON movie_platform_availability
  FOR DELETE USING (
    get_admin_role() = ANY (ARRAY['super_admin', 'admin'])
    OR (
      get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM movie_production_houses mph
        JOIN admin_ph_assignments apa ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_platform_availability.movie_id
          AND apa.user_id = auth.uid()
      )
    )
  );

-- ── 5. Audit trigger ─────────────────────────────────────────────────────────

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON movie_platform_availability
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
