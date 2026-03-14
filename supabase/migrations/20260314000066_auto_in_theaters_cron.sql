-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage so cron can execute in the public schema
GRANT USAGE ON SCHEMA public TO postgres;

-- Function: auto-set in_theaters = true for movies releasing today or premiering today,
-- and for re-releases (theatrical runs) starting today.
-- Runs at midnight IST daily. Only ADDS to theaters, never removes.
CREATE OR REPLACE FUNCTION public.auto_set_in_theaters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := CURRENT_DATE;
BEGIN
  -- Movies with premiere_date = today
  UPDATE movies
  SET in_theaters = true, updated_at = now()
  WHERE in_theaters = false
    AND premiere_date = today;

  -- Movies with release_date = today (only if no premiere_date set, since premiere
  -- would have already triggered it on an earlier date)
  UPDATE movies
  SET in_theaters = true, updated_at = now()
  WHERE in_theaters = false
    AND premiere_date IS NULL
    AND release_date = today;

  -- Re-releases: theatrical runs starting today
  UPDATE movies
  SET in_theaters = true, updated_at = now()
  WHERE in_theaters = false
    AND id IN (
      SELECT movie_id FROM movie_theatrical_runs
      WHERE release_date = today
    );
END;
$$;

-- Schedule: run daily at 18:30 UTC = midnight IST (00:00 IST)
SELECT cron.schedule(
  'auto-set-in-theaters',
  '30 18 * * *',
  'SELECT public.auto_set_in_theaters()'
);
