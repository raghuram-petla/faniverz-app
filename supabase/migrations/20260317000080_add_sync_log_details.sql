-- Add details JSONB column to sync_logs for storing what was processed (movie/actor names)
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '[]';
