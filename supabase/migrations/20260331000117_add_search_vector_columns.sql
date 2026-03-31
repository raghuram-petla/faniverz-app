-- Add tsvector search_vector columns for full-text search to all searchable tables.
-- Columns are nullable initially; backfilled in migration 000120 after triggers are created.

ALTER TABLE public.movies           ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.actors           ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.production_houses ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.profiles         ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.reviews          ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.news_feed        ADD COLUMN IF NOT EXISTS search_vector tsvector;
