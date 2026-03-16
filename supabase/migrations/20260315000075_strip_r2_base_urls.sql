-- Strip R2/MinIO base URL prefixes from all image columns.
-- After this migration, image columns store only the relative key (e.g. "abc123.jpg")
-- instead of a full URL (e.g. "http://10.0.0.23:9000/faniverz-movie-posters/abc123.jpg").
-- External URLs (TMDB CDN, YouTube, pravatar, Google) are left untouched.
-- The base URL is now supplied at runtime via environment variables per developer/environment.

-- Helper: extracts the last path segment from a URL, or returns the value unchanged
-- if it does not look like an absolute URL (already a relative path).
-- Leaves external CDN URLs (tmdb.org, youtube.com, pravatar.cc, googleapis.com,
-- googleusercontent.com, img.youtube.com) untouched.
CREATE OR REPLACE FUNCTION _strip_r2_base(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- Already a relative path (no scheme) — leave as-is
    WHEN url NOT LIKE 'http://%' AND url NOT LIKE 'https://%' THEN url
    -- External CDN URLs — leave as-is
    WHEN url LIKE '%image.tmdb.org%' THEN url
    WHEN url LIKE '%img.youtube.com%' THEN url
    WHEN url LIKE '%i.pravatar.cc%' THEN url
    WHEN url LIKE '%googleapis.com%' THEN url
    WHEN url LIKE '%googleusercontent.com%' THEN url
    -- R2/MinIO URL — extract last path segment (the key)
    ELSE regexp_replace(url, '^.+/([^/]+)$', '\1')
  END;
$$;

-- movies.poster_url and movies.backdrop_url
UPDATE movies SET poster_url   = _strip_r2_base(poster_url)   WHERE poster_url   IS NOT NULL;
UPDATE movies SET backdrop_url = _strip_r2_base(backdrop_url) WHERE backdrop_url IS NOT NULL;

-- movie_posters.image_url  (poster gallery)
UPDATE movie_posters SET image_url = _strip_r2_base(image_url) WHERE image_url IS NOT NULL;

-- actors.photo_url
UPDATE actors SET photo_url = _strip_r2_base(photo_url) WHERE photo_url IS NOT NULL;

-- profiles.avatar_url
UPDATE profiles SET avatar_url = _strip_r2_base(avatar_url) WHERE avatar_url IS NOT NULL;

-- platforms.logo_url
UPDATE platforms SET logo_url = _strip_r2_base(logo_url) WHERE logo_url IS NOT NULL;

-- production_houses.logo_url
UPDATE production_houses SET logo_url = _strip_r2_base(logo_url) WHERE logo_url IS NOT NULL;

-- news_feed.thumbnail_url  (propagated from movie_posters / movies — strip only non-external)
UPDATE news_feed SET thumbnail_url = _strip_r2_base(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Drop the helper function; it was only needed for this one-time migration
DROP FUNCTION _strip_r2_base(text);
