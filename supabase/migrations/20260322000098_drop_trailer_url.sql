-- Drop the legacy trailer_url column from movies.
-- Trailers are stored in movie_videos (since migration 20240101000028).
-- Before dropping, migrate any orphaned trailer_url values into movie_videos.

-- Step 1: Insert orphaned trailer_url values into movie_videos.
-- Only inserts when trailer_url is set AND no movie_videos row already
-- has a matching youtube_id for that movie.
INSERT INTO movie_videos (movie_id, youtube_id, title, video_type, display_order)
SELECT
  m.id,
  -- Extract the YouTube video ID from the URL:
  --   https://www.youtube.com/watch?v=XXXX  →  XXXX
  --   https://youtu.be/XXXX                 →  XXXX
  CASE
    WHEN m.trailer_url LIKE '%youtube.com/watch?v=%'
      THEN split_part(split_part(m.trailer_url, 'v=', 2), '&', 1)
    WHEN m.trailer_url LIKE '%youtu.be/%'
      THEN split_part(split_part(m.trailer_url, 'youtu.be/', 2), '?', 1)
    ELSE NULL
  END AS youtube_id,
  m.title || ' - Official Trailer',
  'trailer',
  0
FROM movies m
WHERE m.trailer_url IS NOT NULL
  AND m.trailer_url <> ''
  -- Only extract valid YouTube IDs (non-empty after parsing)
  AND CASE
    WHEN m.trailer_url LIKE '%youtube.com/watch?v=%'
      THEN split_part(split_part(m.trailer_url, 'v=', 2), '&', 1)
    WHEN m.trailer_url LIKE '%youtu.be/%'
      THEN split_part(split_part(m.trailer_url, 'youtu.be/', 2), '?', 1)
    ELSE NULL
  END IS NOT NULL
  -- Skip movies that already have this video in movie_videos
  AND NOT EXISTS (
    SELECT 1 FROM movie_videos mv
    WHERE mv.movie_id = m.id
      AND mv.youtube_id = CASE
        WHEN m.trailer_url LIKE '%youtube.com/watch?v=%'
          THEN split_part(split_part(m.trailer_url, 'v=', 2), '&', 1)
        WHEN m.trailer_url LIKE '%youtu.be/%'
          THEN split_part(split_part(m.trailer_url, 'youtu.be/', 2), '?', 1)
        ELSE NULL
      END
  );

-- Step 2: Drop the column.
ALTER TABLE movies DROP COLUMN trailer_url;
