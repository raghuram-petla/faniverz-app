-- Notifications table: in-app notifications for users

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('release', 'watchlist', 'trending', 'reminder')),
  title text NOT NULL,
  message text NOT NULL,
  movie_id uuid REFERENCES movies ON DELETE SET NULL,
  platform_id text REFERENCES platforms ON DELETE SET NULL,
  read boolean DEFAULT false,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);
