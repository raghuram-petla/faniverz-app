-- Change default preferred language from English to Telugu (launching in Telugu first)
ALTER TABLE profiles ALTER COLUMN preferred_lang SET DEFAULT 'te';
