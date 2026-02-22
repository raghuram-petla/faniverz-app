-- On watchlist INSERT: schedule T-1 day (09:00 IST) and T-0 (08:00 IST) notifications
-- Only for future movies where user has notify_watchlist = true

CREATE OR REPLACE FUNCTION schedule_watchlist_notifications()
RETURNS TRIGGER AS $$
DECLARE
  movie_record RECORD;
  user_prefs RECORD;
  t_minus_1 TIMESTAMPTZ;
  t_zero TIMESTAMPTZ;
BEGIN
  -- Get movie details
  SELECT id, title, release_date INTO movie_record
  FROM movies
  WHERE id = NEW.movie_id;

  IF movie_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only schedule for future releases
  IF movie_record.release_date <= CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  -- Check user notification preferences
  SELECT notify_watchlist INTO user_prefs
  FROM profiles
  WHERE id = NEW.user_id;

  IF user_prefs IS NULL OR user_prefs.notify_watchlist = false THEN
    RETURN NEW;
  END IF;

  -- T-1 day at 09:00 IST (03:30 UTC)
  t_minus_1 := (movie_record.release_date - INTERVAL '1 day')::DATE + TIME '03:30:00';
  -- T-0 at 08:00 IST (02:30 UTC)
  t_zero := movie_record.release_date::DATE + TIME '02:30:00';

  -- Schedule "releasing tomorrow" notification
  INSERT INTO notification_queue (user_id, movie_id, type, title, body, data, scheduled_for, status)
  VALUES (
    NEW.user_id,
    NEW.movie_id,
    'watchlist_reminder',
    movie_record.title || ' releases tomorrow!',
    'Get ready! ' || movie_record.title || ' is releasing tomorrow.',
    jsonb_build_object('movieId', NEW.movie_id),
    t_minus_1,
    'pending'
  );

  -- Schedule "out today" notification
  INSERT INTO notification_queue (user_id, movie_id, type, title, body, data, scheduled_for, status)
  VALUES (
    NEW.user_id,
    NEW.movie_id,
    'release_day',
    movie_record.title || ' is out today!',
    movie_record.title || ' is now available. Enjoy!',
    jsonb_build_object('movieId', NEW.movie_id),
    t_zero,
    'pending'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_watchlist_notification
  AFTER INSERT ON watchlists
  FOR EACH ROW
  EXECUTE FUNCTION schedule_watchlist_notifications();
