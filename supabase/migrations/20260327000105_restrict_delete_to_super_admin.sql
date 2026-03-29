-- Restrict all DELETE permissions to super_admin (+ root) only.
-- Admin and production_house_admin can no longer delete any entity.

-- ============================================================
-- MOVIES
-- ============================================================
DROP POLICY IF EXISTS "Role-aware movie delete" ON movies;
CREATE POLICY "Role-aware movie delete"
  ON movies FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- ACTORS
-- ============================================================
DROP POLICY IF EXISTS "Role-aware actor delete" ON actors;
CREATE POLICY "Role-aware actor delete"
  ON actors FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_CAST
-- ============================================================
DROP POLICY IF EXISTS "Role-aware movie_cast delete" ON movie_cast;
CREATE POLICY "Role-aware movie_cast delete"
  ON movie_cast FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_POSTERS (renamed to movie_images — skip if not exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_posters') THEN
    DROP POLICY IF EXISTS "Role-aware movie_posters delete" ON movie_posters;
    CREATE POLICY "Role-aware movie_posters delete"
      ON movie_posters FOR DELETE
      USING (public.is_super_admin());
  END IF;
END $$;

-- ============================================================
-- MOVIE_VIDEOS
-- ============================================================
DROP POLICY IF EXISTS "Role-aware movie_videos delete" ON movie_videos;
CREATE POLICY "Role-aware movie_videos delete"
  ON movie_videos FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_PLATFORMS
-- ============================================================
DROP POLICY IF EXISTS "Role-aware movie_platforms delete" ON movie_platforms;
CREATE POLICY "Role-aware movie_platforms delete"
  ON movie_platforms FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_THEATRICAL_RUNS
-- ============================================================
DROP POLICY IF EXISTS "Role-aware theatrical_runs delete" ON movie_theatrical_runs;
CREATE POLICY "Role-aware theatrical_runs delete"
  ON movie_theatrical_runs FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_PRODUCTION_HOUSES
-- ============================================================
DROP POLICY IF EXISTS "Role-aware movie_production_houses delete" ON movie_production_houses;
CREATE POLICY "Role-aware movie_production_houses delete"
  ON movie_production_houses FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- PLATFORMS
-- ============================================================
DROP POLICY IF EXISTS "Role-aware platform delete" ON platforms;
CREATE POLICY "Role-aware platform delete"
  ON platforms FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- PRODUCTION_HOUSES
-- ============================================================
DROP POLICY IF EXISTS "Role-aware production_house delete" ON production_houses;
CREATE POLICY "Role-aware production_house delete"
  ON production_houses FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- SURPRISE_CONTENT
-- ============================================================
DROP POLICY IF EXISTS "Role-aware surprise delete" ON surprise_content;
CREATE POLICY "Role-aware surprise delete"
  ON surprise_content FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- NEWS_FEED
-- ============================================================
DROP POLICY IF EXISTS "Role-aware news_feed delete" ON news_feed;
CREATE POLICY "Role-aware news_feed delete"
  ON news_feed FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_BACKDROPS (merged into movie_images — skip if not exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_backdrops') THEN
    DROP POLICY IF EXISTS "Admins can delete movie_backdrops" ON movie_backdrops;
    CREATE POLICY "Super admins can delete movie_backdrops"
      ON movie_backdrops FOR DELETE
      USING (public.is_super_admin());
  END IF;
END $$;

-- ============================================================
-- MOVIE_KEYWORDS
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete movie_keywords" ON movie_keywords;
CREATE POLICY "Super admins can delete movie_keywords"
  ON movie_keywords FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_IMAGES
-- ============================================================
DROP POLICY IF EXISTS "Role-aware movie_images delete" ON movie_images;
CREATE POLICY "Role-aware movie_images delete"
  ON movie_images FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- COUNTRIES
-- ============================================================
DROP POLICY IF EXISTS "countries_admin_delete" ON countries;
CREATE POLICY "countries_admin_delete"
  ON countries FOR DELETE
  USING (public.is_super_admin());

-- ============================================================
-- MOVIE_PLATFORM_AVAILABILITY
-- ============================================================
DROP POLICY IF EXISTS "mpa_delete" ON movie_platform_availability;
CREATE POLICY "mpa_delete"
  ON movie_platform_availability FOR DELETE
  USING (public.is_super_admin());

NOTIFY pgrst, 'reload schema';
