-- Add all prominent Indian film industry languages.
-- Uses ON CONFLICT to safely skip already-existing languages (te, ta, hi).

INSERT INTO languages (code, name) VALUES
  ('te', 'Telugu'),
  ('ta', 'Tamil'),
  ('hi', 'Hindi'),
  ('ml', 'Malayalam'),
  ('kn', 'Kannada'),
  ('bn', 'Bengali'),
  ('mr', 'Marathi'),
  ('gu', 'Gujarati'),
  ('pa', 'Punjabi'),
  ('or', 'Odia'),
  ('bh', 'Bhojpuri'),
  ('as', 'Assamese')
ON CONFLICT (code) DO NOTHING;
