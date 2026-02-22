-- Notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  movie_id INTEGER REFERENCES public.movies(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('watchlist_reminder', 'release_day', 'ott_available', 'weekly_digest')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Indexes for the send-push-notification edge function CRON query
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON public.notification_queue(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON public.notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_movie_id ON public.notification_queue(movie_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
