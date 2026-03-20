-- Unify movie_posters + movie_backdrops into a single movie_images table.
-- Rename movie_posters → movie_images, add image_type + is_main_backdrop,
-- migrate movie_backdrops data, then drop the old table.

-- ============================================================
-- 1. RENAME TABLE
-- ============================================================
ALTER TABLE movie_posters RENAME TO movie_images;

-- ============================================================
-- 2. ADD NEW COLUMNS
-- ============================================================
ALTER TABLE movie_images ADD COLUMN image_type text NOT NULL DEFAULT 'poster'
  CHECK (image_type IN ('poster', 'backdrop'));
ALTER TABLE movie_images ADD COLUMN is_main_backdrop boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3. RENAME is_main → is_main_poster
-- ============================================================
ALTER TABLE movie_images RENAME COLUMN is_main TO is_main_poster;

-- ============================================================
-- 4. MAKE title NULLABLE (backdrops don't have titles)
-- ============================================================
ALTER TABLE movie_images ALTER COLUMN title DROP NOT NULL;

-- ============================================================
-- 5. RECREATE INDICES
-- ============================================================
DROP INDEX IF EXISTS idx_movie_posters_one_main;
CREATE UNIQUE INDEX idx_movie_images_one_main_poster
  ON movie_images (movie_id) WHERE is_main_poster = true;
CREATE UNIQUE INDEX idx_movie_images_one_main_backdrop
  ON movie_images (movie_id) WHERE is_main_backdrop = true;

DROP INDEX IF EXISTS idx_movie_posters_movie_id;
CREATE INDEX idx_movie_images_movie_id ON movie_images(movie_id);

-- ============================================================
-- 6. UPDATE NEWS FEED TRIGGER FUNCTION (must happen BEFORE inserting
--    backdrop data, since the old trigger would try to insert into
--    news_feed with NULL title and fail the NOT NULL constraint)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_movie_poster_to_feed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_movie_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.news_feed
    WHERE source_table = 'movie_images' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Only create feed entries for poster-type images (not backdrops)
  IF NEW.image_type = 'backdrop' THEN RETURN NEW; END IF;

  SELECT title INTO v_movie_title FROM public.movies WHERE id = NEW.movie_id;

  INSERT INTO public.news_feed (
    feed_type, content_type, title, description, movie_id,
    source_table, source_id, thumbnail_url, published_at
  ) VALUES (
    'poster', 'poster',
    COALESCE(v_movie_title, '') || ' - ' || COALESCE(NEW.title, 'Image'),
    NEW.description, NEW.movie_id,
    'movie_images', NEW.id, NEW.image_url,
    COALESCE(NEW.poster_date, NEW.created_at)
  )
  ON CONFLICT (source_table, source_id) WHERE source_table IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    published_at = EXCLUDED.published_at;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. MIGRATE movie_backdrops DATA
-- ============================================================
INSERT INTO movie_images (
  movie_id, image_url, image_type, title, is_main_poster, is_main_backdrop,
  tmdb_file_path, iso_639_1, width, height, vote_average, display_order
)
SELECT
  b.movie_id, b.image_url, 'backdrop', NULL, false,
  -- Mark as main_backdrop if image_url matches movies.backdrop_url
  COALESCE(b.image_url = m.backdrop_url, false),
  b.tmdb_file_path, b.iso_639_1, b.width, b.height,
  COALESCE(b.vote_average, 0),
  b.display_order + 1000  -- offset to avoid collisions with poster display_order
FROM movie_backdrops b
LEFT JOIN movies m ON m.id = b.movie_id;

-- ============================================================
-- 7. DROP OLD TABLE
-- ============================================================
DROP TABLE movie_backdrops;

-- ============================================================
-- 8. UPDATE RLS POLICIES
-- ============================================================
-- Drop original simple policies (from 20240101000028_movie_media.sql)
DROP POLICY IF EXISTS "Movie posters are viewable by everyone" ON movie_images;
DROP POLICY IF EXISTS "Admins can insert movie_posters" ON movie_images;
DROP POLICY IF EXISTS "Admins can update movie_posters" ON movie_images;
DROP POLICY IF EXISTS "Admins can delete movie_posters" ON movie_images;

-- Drop RBAC-aware policies (from 20240101000035_rbac_rls_policies.sql)
DROP POLICY IF EXISTS "Role-aware movie_posters insert" ON movie_images;
DROP POLICY IF EXISTS "Role-aware movie_posters update" ON movie_images;
DROP POLICY IF EXISTS "Role-aware movie_posters delete" ON movie_images;

-- Recreate with new names referencing movie_images
CREATE POLICY "Movie images are viewable by everyone"
  ON movie_images FOR SELECT USING (true);

CREATE POLICY "Role-aware movie_images insert"
  ON movie_images FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'ph_admin' AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_images.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_images update"
  ON movie_images FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'ph_admin' AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_images.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_images delete"
  ON movie_images FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'ph_admin' AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_images.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 9. AUDIT TRIGGER (re-create on renamed table)
-- ============================================================
DROP TRIGGER IF EXISTS audit_trigger ON movie_images;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_images
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================
-- 10. NEWS FEED TRIGGER (function already updated in step 6)
-- ============================================================
DROP TRIGGER IF EXISTS trg_movie_poster_feed ON movie_images;
CREATE TRIGGER trg_movie_image_feed
  AFTER INSERT OR UPDATE OR DELETE ON movie_images
  FOR EACH ROW EXECUTE FUNCTION sync_movie_poster_to_feed();

-- ============================================================
-- 11. UPDATE EXISTING NEWS_FEED ROWS
-- ============================================================
UPDATE news_feed SET source_table = 'movie_images'
WHERE source_table = 'movie_posters';
