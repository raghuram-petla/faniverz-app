-- News Feed: RLS policies
-- Public read, admin-only write (super_admin + admin only, no PH admin)

CREATE POLICY "Anyone can read news feed"
  ON news_feed FOR SELECT
  USING (true);

CREATE POLICY "Role-aware news_feed insert"
  ON news_feed FOR INSERT
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware news_feed update"
  ON news_feed FOR UPDATE
  USING (public.get_admin_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_admin_role() IN ('super_admin', 'admin'));

CREATE POLICY "Role-aware news_feed delete"
  ON news_feed FOR DELETE
  USING (public.get_admin_role() IN ('super_admin', 'admin'));

NOTIFY pgrst, 'reload schema';
