-- Fix feed entries where thumbnail_url doesn't match the source movie_images row.
-- Root cause: race condition when poster and backdrop syncs run in parallel —
-- concurrent trigger executions can cross-contaminate NEW.image_url values.
-- This corrects any existing mismatches.

UPDATE public.news_feed nf
SET thumbnail_url = mi.image_url
FROM public.movie_images mi
WHERE nf.source_table = 'movie_images'
  AND nf.source_id = mi.id
  AND nf.thumbnail_url IS DISTINCT FROM mi.image_url;
