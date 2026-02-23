-- Database triggers for automatic data maintenance

-- ============================================================
-- 1. Auto-update updated_at columns via moddatetime extension
-- ============================================================

-- Movies: auto-update updated_at on row modification
CREATE TRIGGER set_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Profiles: auto-update updated_at on row modification
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Reviews: auto-update updated_at on row modification
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================
-- 2. Recalculate movie rating and review_count on review changes
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_movie_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_movie_id uuid;
BEGIN
  -- Determine which movie_id to recalculate for
  IF TG_OP = 'DELETE' THEN
    target_movie_id := OLD.movie_id;
  ELSE
    target_movie_id := NEW.movie_id;
  END IF;

  -- Recalculate rating and review_count from all reviews for this movie
  UPDATE public.movies
  SET
    rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 1)
      FROM public.reviews r
      WHERE r.movie_id = target_movie_id
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews r
      WHERE r.movie_id = target_movie_id
    )
  WHERE id = target_movie_id;

  -- Handle UPDATE where movie_id changed (recalculate old movie too)
  IF TG_OP = 'UPDATE' AND OLD.movie_id IS DISTINCT FROM NEW.movie_id THEN
    UPDATE public.movies
    SET
      rating = COALESCE((
        SELECT ROUND(AVG(r.rating)::numeric, 1)
        FROM public.reviews r
        WHERE r.movie_id = OLD.movie_id
      ), 0),
      review_count = (
        SELECT COUNT(*)
        FROM public.reviews r
        WHERE r.movie_id = OLD.movie_id
      )
    WHERE id = OLD.movie_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_review_change_update_movie_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_movie_rating();

-- ============================================================
-- 3. Sync helpful_count on review_helpful changes
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_helpful_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_review_id uuid;
BEGIN
  -- Determine which review_id to recalculate for
  IF TG_OP = 'DELETE' THEN
    target_review_id := OLD.review_id;
  ELSE
    target_review_id := NEW.review_id;
  END IF;

  -- Recalculate helpful_count from review_helpful rows
  UPDATE public.reviews
  SET helpful_count = (
    SELECT COUNT(*)
    FROM public.review_helpful rh
    WHERE rh.review_id = target_review_id
  )
  WHERE id = target_review_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_review_helpful_change_update_count
  AFTER INSERT OR DELETE ON review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION public.update_helpful_count();
