-- Backfill video feed items where published_at was set from video_date instead of created_at
--
-- Root cause: migration 20260329000108 reintroduced video_date into the trigger's COALESCE
-- chain. Movies imported during the window between 20260329000108 and 20260329000111 (when the
-- trigger was fixed) got published_at = video_date (old TMDB dates) instead of created_at.
--
-- Migration 20260329000111 only fixed future-dated items. This backfill fixes items where
-- published_at is a PAST date that came from video_date (i.e., differs from created_at).
-- Setting them to created_at (import time) makes them fresh and surfaced in the feed.

UPDATE public.news_feed nf
SET published_at = mv.created_at
FROM public.movie_videos mv
WHERE nf.source_table = 'movie_videos'
  AND nf.source_id = mv.id
  AND nf.published_at::date != mv.created_at::date;
