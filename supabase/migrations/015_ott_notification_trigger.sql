-- On ott_releases INSERT: notify all users who watchlisted this movie
-- and have notify_ott = true

CREATE OR REPLACE FUNCTION notify_ott_release()
RETURNS TRIGGER AS $$
DECLARE
  movie_record RECORD;
  platform_record RECORD;
  watchlister RECORD;
BEGIN
  -- Get movie details
  SELECT id, title INTO movie_record
  FROM movies
  WHERE id = NEW.movie_id;

  IF movie_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get platform name
  SELECT name INTO platform_record
  FROM platforms
  WHERE id = NEW.platform_id;

  -- Find all watchlisters with notify_ott = true
  FOR watchlister IN
    SELECT w.user_id
    FROM watchlists w
    JOIN profiles p ON p.id = w.user_id
    WHERE w.movie_id = NEW.movie_id
      AND p.notify_ott = true
  LOOP
    INSERT INTO notification_queue (user_id, movie_id, type, title, body, data, scheduled_for, status)
    VALUES (
      watchlister.user_id,
      NEW.movie_id,
      'ott_available',
      movie_record.title || ' is now on ' || COALESCE(platform_record.name, 'OTT'),
      'Watch ' || movie_record.title || ' now on ' || COALESCE(platform_record.name, 'a streaming platform') || '!',
      jsonb_build_object('movieId', NEW.movie_id),
      NOW(),
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ott_notification
  AFTER INSERT ON ott_releases
  FOR EACH ROW
  EXECUTE FUNCTION notify_ott_release();
