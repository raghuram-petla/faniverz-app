-- On watchlist DELETE: cancel pending notifications for that user+movie

CREATE OR REPLACE FUNCTION cancel_watchlist_notifications()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE notification_queue
  SET status = 'cancelled'
  WHERE user_id = OLD.user_id
    AND movie_id = OLD.movie_id
    AND status = 'pending';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_watchlist_delete_cancel
  AFTER DELETE ON watchlists
  FOR EACH ROW
  EXECUTE FUNCTION cancel_watchlist_notifications();
