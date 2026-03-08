-- Allow movies to be created without a release date (e.g. early announcements like "SSR31")
ALTER TABLE movies ALTER COLUMN release_date DROP NOT NULL;
