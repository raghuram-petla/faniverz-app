-- Review aggregation trigger: auto-updates movies.vote_average and vote_count
-- on review INSERT/UPDATE/DELETE

CREATE OR REPLACE FUNCTION update_movie_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_movie_id INT;
BEGIN
  -- Determine which movie_id to update
  IF TG_OP = 'DELETE' THEN
    target_movie_id := OLD.movie_id;
  ELSE
    target_movie_id := NEW.movie_id;
  END IF;

  -- Update the movie's aggregate stats
  UPDATE movies
  SET
    vote_average = COALESCE(
      (SELECT ROUND(AVG(rating)::NUMERIC, 1)
       FROM reviews
       WHERE movie_id = target_movie_id),
      0
    ),
    vote_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE movie_id = target_movie_id
    ),
    updated_at = NOW()
  WHERE id = target_movie_id;

  -- For UPDATE that changes movie_id (edge case), also update the old movie
  IF TG_OP = 'UPDATE' AND OLD.movie_id != NEW.movie_id THEN
    UPDATE movies
    SET
      vote_average = COALESCE(
        (SELECT ROUND(AVG(rating)::NUMERIC, 1)
         FROM reviews
         WHERE movie_id = OLD.movie_id),
        0
      ),
      vote_count = (
        SELECT COUNT(*)
        FROM reviews
        WHERE movie_id = OLD.movie_id
      ),
      updated_at = NOW()
    WHERE id = OLD.movie_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_movie_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_review_stats();
