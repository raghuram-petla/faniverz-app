-- Add end_date to movie_theatrical_runs so we can close out runs when removing from theaters
ALTER TABLE movie_theatrical_runs ADD COLUMN end_date date;
