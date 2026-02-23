-- Enable required PostgreSQL extensions
-- pg_trgm: trigram-based text similarity for fuzzy search
-- moddatetime: auto-update timestamp columns on row modification

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;
