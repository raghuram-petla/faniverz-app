-- =============================================================================
-- Faniverz Telugu Movie Calendar — Seed Data
-- =============================================================================
-- Idempotent: all inserts use ON CONFLICT DO NOTHING.
-- Run with: supabase db reset   (applies migrations then seed)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. OTT Platforms
-- -----------------------------------------------------------------------------
INSERT INTO platforms (id, name, logo, color, display_order) VALUES
  ('aha',     'Aha',              'aha', '#FF6B00', 1),
  ('netflix', 'Netflix',          'N',   '#E50914', 2),
  ('prime',   'Amazon Prime',     'P',   '#00A8E1', 3),
  ('hotstar', 'Disney+ Hotstar',  'H',   '#0F1014', 4),
  ('zee5',    'ZEE5',             'Z5',  '#8E3ED6', 5),
  ('sunnxt',  'Sun NXT',          'SN',  '#FF6600', 6),
  ('sonyliv', 'SonyLIV',          'SL',  '#0078FF', 7),
  ('etvwin',  'ETV Win',          'EW',  '#FF0000', 8)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Movies (12 Telugu films)
-- -----------------------------------------------------------------------------
INSERT INTO movies (
  title, poster_url, backdrop_url, release_date, runtime,
  genres, certification, trailer_url, synopsis, director,
  release_type, rating, review_count
) VALUES
  (
    'Pushpa 2: The Rule',
    'https://image.tmdb.org/t/p/w500/t5ePZYRibJ0EEK1FK3GhihVkDW5.jpg',
    'https://image.tmdb.org/t/p/w1280/keC82cQ8q0ZHthrbvzWq04kGnbv.jpg',
    '2024-12-05', 200,
    ARRAY['Action','Drama'], 'UA',
    'https://www.youtube.com/watch?v=pushpa2trailer',
    'Pushpa Raj continues his meteoric rise in the smuggling syndicate, navigating treacherous alliances and deadly rivalries while the law closes in on his empire.',
    'Sukumar',
    'theatrical', 4.2, 156
  ),
  (
    'Kalki 2898 AD',
    'https://image.tmdb.org/t/p/w500/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg',
    'https://image.tmdb.org/t/p/w1280/o8XSR1SONnjcsv84NRu6Mwsl5io.jpg',
    '2024-06-27', 181,
    ARRAY['Sci-Fi','Action','Drama'], 'UA',
    'https://www.youtube.com/watch?v=kalki2898adtrailer',
    'In a dystopian future set in 2898 AD, a bounty hunter named Bhairava embarks on a mythological quest intertwined with the prophecy of the tenth avatar of Vishnu.',
    'Nag Ashwin',
    'ott', 3.8, 234
  ),
  (
    'Devara: Part 1',
    'https://image.tmdb.org/t/p/w500/lQfuaXjANoTsdx5iS0gCXlK9D2L.jpg',
    'https://image.tmdb.org/t/p/w1280/hAQnXxOwCjgYcKRgTdYPRC8neqL.jpg',
    '2024-09-27', 165,
    ARRAY['Action','Thriller'], 'UA',
    'https://www.youtube.com/watch?v=devaratrailer',
    'A fierce leader protects his coastal village from smugglers and corruption, but when his son must step into his shoes, a new chapter of violence and vengeance unfolds.',
    'Koratala Siva',
    'theatrical', 3.5, 89
  ),
  (
    'Lucky Baskhar',
    'https://image.tmdb.org/t/p/w500/a47JQFl9L7VDa79tEvnTOJe0rPa.jpg',
    'https://image.tmdb.org/t/p/w1280/q8UyN4XhpmChtneZXdZ8fktQka6.jpg',
    '2024-10-31', 149,
    ARRAY['Crime','Drama','Thriller'], 'UA',
    'https://www.youtube.com/watch?v=luckybaskhartrailer',
    'A meek bank employee stumbles upon a financial scam and transforms into a cunning mastermind, risking everything for a shot at a better life for his family.',
    'Venky Atluri',
    'ott', 4.5, 178
  ),
  (
    'Game Changer',
    'https://image.tmdb.org/t/p/w500/qtOGsZoLW7QceqKmsOy5nSM6Aik.jpg',
    'https://image.tmdb.org/t/p/w1280/aBw406SvghTKV6CTK9t84Bo9Xik.jpg',
    '2025-01-10', 157,
    ARRAY['Action','Political','Drama'], 'UA',
    'https://www.youtube.com/watch?v=gamechangertrailer',
    'An idealistic IAS officer takes on a corrupt political system, uncovering a web of deceit that threatens democracy while fighting to bring real change.',
    'Shankar',
    'theatrical', 2.8, 120
  ),
  (
    'Daaku Maharaaj',
    'https://image.tmdb.org/t/p/w500/rGW9ad5TERuoluGSkgF1wHXP45H.jpg',
    'https://image.tmdb.org/t/p/w1280/fWLfoaen7tv3mUT65KWHg7zCFYn.jpg',
    '2025-03-28', NULL,
    ARRAY['Action','Comedy'], NULL,
    NULL,
    'A lovable outlaw with a heart of gold navigates the wild terrain of rural Telangana, outsmarting both bandits and authorities with his quick wit.',
    'Bobby Kolli',
    'upcoming', 0, 0
  ),
  (
    'Thandel',
    'https://image.tmdb.org/t/p/w500/uaMcu3I9l3qyYovya7dwUcdU6ve.jpg',
    'https://image.tmdb.org/t/p/w1280/8mCApaSTpIj3y1LnHpBqzdy9rEW.jpg',
    '2025-02-07', NULL,
    ARRAY['Action','Drama'], NULL,
    NULL,
    'Based on true events, fishermen from Srikakulam venture into dangerous waters near the Indo-Pakistan maritime border and must fight for survival.',
    'Chandoo Mondeti',
    'upcoming', 0, 0
  ),
  (
    'Sankranthiki Vasthunnam',
    'https://image.tmdb.org/t/p/w500/gFa07KuR3tWFI6YFTeGz930zeMo.jpg',
    'https://image.tmdb.org/t/p/w1280/34vhD3KFITH2Ymeh1wF73zZXYDZ.jpg',
    '2025-01-14', 146,
    ARRAY['Action','Comedy'], 'UA',
    'https://www.youtube.com/watch?v=sankranthikitrailer',
    'A former cop is pulled back into action during the festive Sankranti season, juggling family chaos and a thrilling investigation with comedic flair.',
    'Anil Ravipudi',
    'theatrical', 3.9, 95
  ),
  (
    'Kubera',
    'https://image.tmdb.org/t/p/w500/xjLC5DeA4FQTBv4xe8r3wYqh8lu.jpg',
    'https://image.tmdb.org/t/p/w1280/nbyTX77u3qELm9DYPgYfva7vAwj.jpg',
    '2025-04-15', NULL,
    ARRAY['Drama','Thriller'], NULL,
    NULL,
    'A gripping tale of wealth, obsession, and moral reckoning as a man''s pursuit of fortune leads him down a dark and irreversible path.',
    'Sekhar Kammula',
    'upcoming', 0, 0
  ),
  (
    'Robinhood',
    'https://image.tmdb.org/t/p/w500/zeH5oAM1A3zgXbvQ3L9GiDs3ldQ.jpg',
    'https://image.tmdb.org/t/p/w1280/q1vULesWRw5h0rlsEGqTNh3FT1R.jpg',
    '2024-11-22', 145,
    ARRAY['Action','Drama'], 'UA',
    'https://www.youtube.com/watch?v=robinhoodtrailer',
    'A rebellious vigilante steals from the corrupt elite to uplift the downtrodden, sparking a revolution that threatens the powerful establishment.',
    'Buchi Babu Sana',
    'ott', 3.2, 67
  ),
  (
    'HIT: The Third Case',
    'https://image.tmdb.org/t/p/w500/wT9tGyFol4RBwkjESXUWeBdnLJn.jpg',
    'https://image.tmdb.org/t/p/w1280/xzpXvyetmrdR3NSRN9uy0xO3lR1.jpg',
    '2025-05-09', NULL,
    ARRAY['Crime','Thriller'], NULL,
    NULL,
    'The Homicide Intervention Team faces its most baffling case yet — a series of connected disappearances that unravel a conspiracy spanning decades.',
    'Sailesh Kolanu',
    'upcoming', 0, 0
  ),
  (
    'Hari Hara Veera Mallu',
    'https://image.tmdb.org/t/p/w500/mKM3yC7kepjfs8A723dqd9hOky8.jpg',
    'https://image.tmdb.org/t/p/w1280/vg0n59EwKomMNJwlbt1CqlgFDI2.jpg',
    '2024-03-28', 158,
    ARRAY['Historical','Action','Adventure'], 'UA',
    'https://www.youtube.com/watch?v=hariharatrailer',
    'Set in the 17th-century Mughal era, a swashbuckling outlaw embarks on an epic adventure filled with daring heists, royal intrigue, and legendary battles.',
    'Krish Jagarlamudi',
    'ott', 2.5, 112
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Actors (10 Telugu stars)
-- -----------------------------------------------------------------------------
INSERT INTO actors (name, photo_url) VALUES
  ('Allu Arjun',            'https://image.tmdb.org/t/p/w500/wHr3bKhYpiDiYVMZLZqebeauEVw.jpg'),
  ('Prabhas',               'https://image.tmdb.org/t/p/w500/u6RVP8ukgLaymeoi5VmX0JRAcCn.jpg'),
  ('Jr NTR',                'https://image.tmdb.org/t/p/w500/5ycQgZ3SPUa12bq0yn1jpToBq9X.jpg'),
  ('Ram Charan',            'https://image.tmdb.org/t/p/w500/twGqYUCR0Yh33j3TcgRTZRBRhTd.jpg'),
  ('Mahesh Babu',           'https://image.tmdb.org/t/p/w500/fcxgYi1h6vywacUg8asM6S0IIhf.jpg'),
  ('Nani',                  'https://image.tmdb.org/t/p/w500/csRjrh58D90LhFNiqNEUTohzoIK.jpg'),
  ('Vijay Deverakonda',     'https://image.tmdb.org/t/p/w500/8oVIWyIoFUal8SJFnmCUtkkm1HP.jpg'),
  ('Ravi Teja',             'https://image.tmdb.org/t/p/w500/5a9g645O30Qzhe3VFjvkhjnNfm2.jpg'),
  ('Samantha Ruth Prabhu',  'https://image.tmdb.org/t/p/w500/2tQHkYrMZrED9Bp7p5dyDs4toDS.jpg'),
  ('Rashmika Mandanna',     'https://image.tmdb.org/t/p/w500/c1wQq0OAzU9nFhGYn4iOoi7dmqD.jpg')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Movie Cast (actors → movies)
-- -----------------------------------------------------------------------------
-- Pushpa 2: Allu Arjun as Pushpa Raj, Rashmika Mandanna as Srivalli
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Pushpa Raj', 1
FROM movies m, actors a
WHERE m.title = 'Pushpa 2: The Rule' AND a.name = 'Allu Arjun'
ON CONFLICT DO NOTHING;

INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Srivalli', 2
FROM movies m, actors a
WHERE m.title = 'Pushpa 2: The Rule' AND a.name = 'Rashmika Mandanna'
ON CONFLICT DO NOTHING;

-- Kalki 2898 AD: Prabhas as Bhairava, Nani special appearance
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bhairava', 1
FROM movies m, actors a
WHERE m.title = 'Kalki 2898 AD' AND a.name = 'Prabhas'
ON CONFLICT DO NOTHING;

INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Special Appearance', 5
FROM movies m, actors a
WHERE m.title = 'Kalki 2898 AD' AND a.name = 'Nani'
ON CONFLICT DO NOTHING;

-- Devara: Jr NTR as Devara/Vara
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Devara/Vara', 1
FROM movies m, actors a
WHERE m.title = 'Devara: Part 1' AND a.name = 'Jr NTR'
ON CONFLICT DO NOTHING;

-- Lucky Baskhar: Nani as Baskhar
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Baskhar', 1
FROM movies m, actors a
WHERE m.title = 'Lucky Baskhar' AND a.name = 'Nani'
ON CONFLICT DO NOTHING;

-- Game Changer: Ram Charan as Ram Nandan
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Ram Nandan', 1
FROM movies m, actors a
WHERE m.title = 'Game Changer' AND a.name = 'Ram Charan'
ON CONFLICT DO NOTHING;

-- Daaku Maharaaj: Nani as Daaku
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Daaku', 1
FROM movies m, actors a
WHERE m.title = 'Daaku Maharaaj' AND a.name = 'Nani'
ON CONFLICT DO NOTHING;

-- Sankranthiki Vasthunnam: Mahesh Babu (seed data — fictional casting)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'himself', 1
FROM movies m, actors a
WHERE m.title = 'Sankranthiki Vasthunnam' AND a.name = 'Mahesh Babu'
ON CONFLICT DO NOTHING;

-- Robinhood: Ravi Teja as Robinhood
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Robinhood', 1
FROM movies m, actors a
WHERE m.title = 'Robinhood' AND a.name = 'Ravi Teja'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Movie–Platform assignments (OTT availability)
-- -----------------------------------------------------------------------------
-- Kalki 2898 AD → Netflix, Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix'
FROM movies m WHERE m.title = 'Kalki 2898 AD'
ON CONFLICT DO NOTHING;

INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime'
FROM movies m WHERE m.title = 'Kalki 2898 AD'
ON CONFLICT DO NOTHING;

-- Lucky Baskhar → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix'
FROM movies m WHERE m.title = 'Lucky Baskhar'
ON CONFLICT DO NOTHING;

-- Robinhood → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha'
FROM movies m WHERE m.title = 'Robinhood'
ON CONFLICT DO NOTHING;

-- Hari Hara Veera Mallu → Aha, Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha'
FROM movies m WHERE m.title = 'Hari Hara Veera Mallu'
ON CONFLICT DO NOTHING;

INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime'
FROM movies m WHERE m.title = 'Hari Hara Veera Mallu'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Surprise Content (curated YouTube videos)
-- -----------------------------------------------------------------------------
INSERT INTO surprise_content (title, description, youtube_id, category, duration, views) VALUES
  (
    'Pushpa 2 - Pushpa Pushpa Song',
    'The chartbusting mass anthem from Pushpa 2: The Rule featuring Allu Arjun.',
    'example1', 'song', '4:32', 45000000
  ),
  (
    'Kalki 2898 AD - Behind the Scenes',
    'An exclusive behind-the-scenes look at the making of India''s most ambitious sci-fi epic.',
    'example2', 'bts', '12:45', 8500000
  ),
  (
    'NTR Interview - Devara',
    'Jr NTR opens up about his dual role in Devara and working with Koratala Siva.',
    'example3', 'interview', '18:30', 3200000
  ),
  (
    'Ram Charan Short Film',
    'A powerful short film featuring Ram Charan that showcases his range beyond commercial cinema.',
    'example4', 'short-film', '22:15', 1500000
  ),
  (
    'Game Changer Official Trailer',
    'The official theatrical trailer of Game Changer starring Ram Charan and directed by Shankar.',
    'example5', 'trailer', '3:15', 67000000
  ),
  (
    'Nani Behind the Scenes - Lucky Baskhar',
    'Nani shares his preparation process and the creative journey behind Lucky Baskhar.',
    'example6', 'bts', '8:45', 2100000
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Seed complete.
-- =============================================================================
