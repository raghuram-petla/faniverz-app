-- Add streaming_url to movie_platforms for Watch On deep links
ALTER TABLE movie_platforms ADD COLUMN streaming_url text;
