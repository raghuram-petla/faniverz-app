-- RBAC: Role-aware RLS policies
-- Replaces admin-write policies with role-based checks:
--   super_admin + admin = full CRUD (same as before)
--   production_house_admin = scoped to their PH's movies + own actors

-- ============================================================
-- MOVIES — PH admins can only mutate movies linked to their PH(s)
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
DROP POLICY IF EXISTS "Admins can update movies" ON movies;
DROP POLICY IF EXISTS "Admins can delete movies" ON movies;

CREATE POLICY "Role-aware movie insert"
  ON movies FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Role-aware movie update"
  ON movies FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movies.id AND apa.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movies.id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie delete"
  ON movies FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movies.id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- ACTORS — PH admins can only update/delete actors they created
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert actors" ON actors;
DROP POLICY IF EXISTS "Admins can update actors" ON actors;
DROP POLICY IF EXISTS "Admins can delete actors" ON actors;

CREATE POLICY "Role-aware actor insert"
  ON actors FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Role-aware actor update"
  ON actors FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Role-aware actor delete"
  ON actors FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND created_by = auth.uid()
    )
  );

-- ============================================================
-- MOVIE_CAST — PH admins scoped to their PH's movies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movie_cast" ON movie_cast;
DROP POLICY IF EXISTS "Admins can update movie_cast" ON movie_cast;
DROP POLICY IF EXISTS "Admins can delete movie_cast" ON movie_cast;

CREATE POLICY "Role-aware movie_cast insert"
  ON movie_cast FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_cast.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_cast update"
  ON movie_cast FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_cast.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_cast delete"
  ON movie_cast FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_cast.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MOVIE_POSTERS — PH admins scoped to their PH's movies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movie_posters" ON movie_posters;
DROP POLICY IF EXISTS "Admins can update movie_posters" ON movie_posters;
DROP POLICY IF EXISTS "Admins can delete movie_posters" ON movie_posters;

CREATE POLICY "Role-aware movie_posters insert"
  ON movie_posters FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_posters.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_posters update"
  ON movie_posters FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_posters.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_posters delete"
  ON movie_posters FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_posters.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MOVIE_VIDEOS — PH admins scoped to their PH's movies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movie_videos" ON movie_videos;
DROP POLICY IF EXISTS "Admins can update movie_videos" ON movie_videos;
DROP POLICY IF EXISTS "Admins can delete movie_videos" ON movie_videos;

CREATE POLICY "Role-aware movie_videos insert"
  ON movie_videos FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_videos.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_videos update"
  ON movie_videos FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_videos.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_videos delete"
  ON movie_videos FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_videos.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MOVIE_PLATFORMS — PH admins scoped to their PH's movies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movie_platforms" ON movie_platforms;
DROP POLICY IF EXISTS "Admins can update movie_platforms" ON movie_platforms;
DROP POLICY IF EXISTS "Admins can delete movie_platforms" ON movie_platforms;

CREATE POLICY "Role-aware movie_platforms insert"
  ON movie_platforms FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_platforms.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_platforms update"
  ON movie_platforms FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_platforms.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_platforms delete"
  ON movie_platforms FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_platforms.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MOVIE_THEATRICAL_RUNS — PH admins scoped to their PH's movies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movie_theatrical_runs" ON movie_theatrical_runs;
DROP POLICY IF EXISTS "Admins can update movie_theatrical_runs" ON movie_theatrical_runs;
DROP POLICY IF EXISTS "Admins can delete movie_theatrical_runs" ON movie_theatrical_runs;
-- Also drop the overly-permissive policy from 000022 that allows ANY authenticated user
DROP POLICY IF EXISTS "Authenticated users can manage theatrical runs" ON movie_theatrical_runs;

CREATE POLICY "Role-aware theatrical_runs insert"
  ON movie_theatrical_runs FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_theatrical_runs.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware theatrical_runs update"
  ON movie_theatrical_runs FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_theatrical_runs.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware theatrical_runs delete"
  ON movie_theatrical_runs FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.movie_production_houses mph
        JOIN public.admin_ph_assignments apa
          ON apa.production_house_id = mph.production_house_id
        WHERE mph.movie_id = movie_theatrical_runs.movie_id AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MOVIE_PRODUCTION_HOUSES — PH admins scoped to their PH's movies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert movie_production_houses" ON movie_production_houses;
DROP POLICY IF EXISTS "Admins can update movie_production_houses" ON movie_production_houses;
DROP POLICY IF EXISTS "Admins can delete movie_production_houses" ON movie_production_houses;

CREATE POLICY "Role-aware movie_production_houses insert"
  ON movie_production_houses FOR INSERT
  WITH CHECK (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.admin_ph_assignments apa
        WHERE apa.production_house_id = movie_production_houses.production_house_id
          AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_production_houses update"
  ON movie_production_houses FOR UPDATE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.admin_ph_assignments apa
        WHERE apa.production_house_id = movie_production_houses.production_house_id
          AND apa.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Role-aware movie_production_houses delete"
  ON movie_production_houses FOR DELETE
  USING (
    public.get_admin_role() IN ('super_admin', 'admin')
    OR (
      public.get_admin_role() = 'production_house_admin'
      AND EXISTS (
        SELECT 1 FROM public.admin_ph_assignments apa
        WHERE apa.production_house_id = movie_production_houses.production_house_id
          AND apa.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- PLATFORMS — Only super_admin and admin (PH admin blocked)
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert platforms" ON platforms;
DROP POLICY IF EXISTS "Admins can update platforms" ON platforms;
DROP POLICY IF EXISTS "Admins can delete platforms" ON platforms;

CREATE POLICY "Role-aware platform insert"
  ON platforms FOR INSERT
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware platform update"
  ON platforms FOR UPDATE
  USING (public.get_admin_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware platform delete"
  ON platforms FOR DELETE
  USING (public.get_admin_role() IN ('super_admin', 'admin'));

-- ============================================================
-- PRODUCTION_HOUSES — Only super_admin and admin can mutate
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert production_houses" ON production_houses;
DROP POLICY IF EXISTS "Admins can update production_houses" ON production_houses;
DROP POLICY IF EXISTS "Admins can delete production_houses" ON production_houses;

CREATE POLICY "Role-aware production_house insert"
  ON production_houses FOR INSERT
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware production_house update"
  ON production_houses FOR UPDATE
  USING (public.get_admin_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware production_house delete"
  ON production_houses FOR DELETE
  USING (public.get_admin_role() IN ('super_admin', 'admin'));

-- ============================================================
-- SURPRISE_CONTENT — Only super_admin and admin (PH admin blocked)
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert surprise_content" ON surprise_content;
DROP POLICY IF EXISTS "Admins can update surprise_content" ON surprise_content;
DROP POLICY IF EXISTS "Admins can delete surprise_content" ON surprise_content;

CREATE POLICY "Role-aware surprise insert"
  ON surprise_content FOR INSERT
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware surprise update"
  ON surprise_content FOR UPDATE
  USING (public.get_admin_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware surprise delete"
  ON surprise_content FOR DELETE
  USING (public.get_admin_role() IN ('super_admin', 'admin'));

-- ============================================================
-- AUDIT_LOG — Super admin sees all, others see own entries only
-- ============================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;

CREATE POLICY "Role-aware audit log read"
  ON audit_log FOR SELECT
  USING (
    public.is_super_admin()
    OR (public.is_admin() AND admin_user_id = auth.uid())
  );

-- ============================================================
-- SYNC_LOGS — Only super_admin and admin
-- ============================================================
DROP POLICY IF EXISTS "Admins can view sync logs" ON sync_logs;

CREATE POLICY "Role-aware sync_logs read"
  ON sync_logs FOR SELECT
  USING (public.get_admin_role() IN ('super_admin', 'admin'));

NOTIFY pgrst, 'reload schema';
