-- Repair: add logo_url to platforms if missing.
-- Migration 20240101000038 was recorded in history but never executed on production,
-- leaving the column absent. This migration is idempotent via IF NOT EXISTS.
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS logo_url text;
