-- Migrate existing movie_platforms data to movie_platform_availability.
-- All existing rows are assumed to be India + flatrate.

INSERT INTO movie_platform_availability
  (movie_id, platform_id, country_code, availability_type, available_from, streaming_url)
SELECT movie_id, platform_id, 'IN', 'flatrate', available_from, streaming_url
FROM movie_platforms
ON CONFLICT (movie_id, platform_id, country_code, availability_type) DO NOTHING;
