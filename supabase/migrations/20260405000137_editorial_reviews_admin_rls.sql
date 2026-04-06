-- Add admin RLS policies for editorial_reviews table.
-- The original migration (131) only had a SELECT policy for published reviews.
-- Admins need to read drafts and perform INSERT/UPDATE/DELETE.

-- Allow admins to read ALL reviews (including unpublished drafts)
CREATE POLICY "Admins can read all editorial reviews"
  ON editorial_reviews FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Allow admins to create editorial reviews
CREATE POLICY "Admins can create editorial reviews"
  ON editorial_reviews FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Allow admins to update editorial reviews
CREATE POLICY "Admins can update editorial reviews"
  ON editorial_reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow admins to delete editorial reviews
CREATE POLICY "Admins can delete editorial reviews"
  ON editorial_reviews FOR DELETE
  TO authenticated
  USING (public.is_admin());
