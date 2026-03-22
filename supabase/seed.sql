-- =============================================================================
-- Faniverz — Seed Data
-- =============================================================================
-- Reference data only: surprise content, general feed items,
-- and admin auto-assign trigger.
-- Movies, actors, and OTT platforms are populated via admin panel TMDB sync.
-- Idempotent: all inserts use ON CONFLICT DO NOTHING.
-- Run with: supabase db reset   (applies migrations then seed)
-- =============================================================================

-- OTT platforms are auto-created by TMDB sync (syncWatchProviders).
-- No manual seeding needed — platforms are created on first movie import.

-- -----------------------------------------------------------------------------
-- 1. Surprise Content (20 curated YouTube videos)
-- -----------------------------------------------------------------------------
INSERT INTO surprise_content (title, description, youtube_id, category, duration, views) VALUES
  ('Pushpa 2 - Pushpa Pushpa Song',
   'The chartbusting mass anthem from Pushpa 2: The Rule featuring Allu Arjun.',
   'example1', 'song', '4:32', 45000000),

  ('Kalki 2898 AD - Behind the Scenes',
   'An exclusive behind-the-scenes look at the making of India''s most ambitious sci-fi epic.',
   'example2', 'bts', '12:45', 8500000),

  ('NTR Interview - Devara',
   'Jr NTR opens up about his dual role in Devara and working with Koratala Siva.',
   'example3', 'interview', '18:30', 3200000),

  ('Ram Charan Short Film',
   'A powerful short film featuring Ram Charan that showcases his range beyond commercial cinema.',
   'example4', 'short-film', '22:15', 1500000),

  ('Game Changer Official Trailer',
   'The official theatrical trailer of Game Changer starring Ram Charan and directed by Shankar.',
   'example5', 'trailer', '3:15', 67000000),

  ('Nani Behind the Scenes - Lucky Baskhar',
   'Nani shares his preparation process and the creative journey behind Lucky Baskhar.',
   'example6', 'bts', '8:45', 2100000),

  ('Pushpa 2 - Angaaron Song',
   'The electrifying mass dance number from Pushpa 2 that set dance floors on fire across India.',
   'example7', 'song', '3:48', 38000000),

  ('Mahesh Babu - SSMB 29 First Look Reaction',
   'The internet explodes as the first look of SSMB 29 directed by SS Rajamouli is revealed.',
   'example8', 'trailer', '2:30', 52000000),

  ('Prabhas - Kalki Making Video',
   'An in-depth making video showing the groundbreaking VFX work behind Kalki 2898 AD.',
   'example9', 'bts', '15:20', 12000000),

  ('Vijay Deverakonda Rapid Fire Interview',
   'Vijay Deverakonda answers fan questions in a hilarious rapid fire round about his upcoming films.',
   'example10', 'interview', '10:15', 4500000),

  ('Samantha Ruth Prabhu - Citadel India Teaser',
   'The explosive first teaser of Samantha in the Indian adaptation of Citadel.',
   'example11', 'trailer', '1:45', 28000000),

  ('Sai Pallavi Dance Compilation',
   'A mesmerizing compilation of Sai Pallavi''s best dance sequences across her Telugu films.',
   'example12', 'song', '6:30', 15000000),

  ('Chiranjeevi - 45 Years in Cinema Tribute',
   'A fan-made tribute celebrating Megastar Chiranjeevi''s 45 glorious years in Telugu cinema.',
   'example13', 'short-film', '12:00', 6800000),

  ('Adivi Sesh - Major Making Documentary',
   'The complete making-of documentary showing how Major was brought to life with authentic detail.',
   'example14', 'bts', '25:00', 3800000),

  ('Rashmika Mandanna Interview - Pushpa Journey',
   'Rashmika Mandanna reflects on her journey as Srivalli and what Pushpa means to her career.',
   'example15', 'interview', '14:20', 5200000),

  ('Nagarjuna - The King Short Film',
   'A powerful short film featuring Nagarjuna exploring themes of aging, legacy, and fatherhood.',
   'example16', 'short-film', '18:45', 2400000),

  ('Devara Official Trailer',
   'The jaw-dropping official trailer of Devara: Part 1 featuring Jr NTR in a never-before-seen avatar.',
   'example17', 'trailer', '3:02', 72000000),

  ('Keerthy Suresh Interview - Mahanati Memories',
   'Keerthy Suresh revisits her National Award-winning performance and shares untold Mahanati stories.',
   'example18', 'interview', '20:10', 3100000),

  ('Oo Antava - Pushpa Remix',
   'The viral remix of the iconic Oo Antava song that became a global dance sensation.',
   'example19', 'song', '4:15', 95000000),

  ('HIT Universe - Complete Timeline Explained',
   'A fan-created breakdown of the entire HIT cinematic universe connecting all three films.',
   'example20', 'short-film', '16:30', 4200000)

ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. General Feed Items
-- -----------------------------------------------------------------------------
INSERT INTO news_feed (feed_type, content_type, title, description, published_at, upvote_count, downvote_count, is_pinned)
VALUES
  ('update', 'update', 'Welcome to Faniverz!',
   'Your one-stop destination for Telugu cinema updates. Follow your favorite movies, actors, and never miss a release!',
   '2024-01-01'::timestamptz, 25, 0, true),

  ('update', 'update', 'Faniverz Community Guidelines',
   'Be respectful, share your honest opinions, and help build the best movie community. Report any inappropriate content.',
   '2024-01-02'::timestamptz, 15, 0, false),

  ('update', 'update', 'Telugu Cinema Box Office: 2024 Wrap-Up',
   '2024 was a record-breaking year for Tollywood with Pushpa 2, Kalki 2898 AD, and Devara leading the charge. Total box office crossed ₹5000 crores!',
   '2025-01-01'::timestamptz, 42, 3, true)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Admin auto-assign trigger
-- -----------------------------------------------------------------------------
-- Auto-assign super_admin to rams.sep5@gmail.com on first Google sign-in.
-- When the user signs in via Google, Supabase creates auth.users → triggers
-- handle_new_user → creates profiles row. This trigger then assigns the role.
CREATE OR REPLACE FUNCTION public.seed_auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email = 'rams.sep5@gmail.com' THEN
    INSERT INTO public.admin_user_roles (user_id, role_id)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_assign_admin ON public.profiles;
CREATE TRIGGER on_profile_assign_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_auto_assign_admin();

-- =============================================================================
-- Seed complete.
-- 20 surprise content | 3 general feed items
-- super_admin auto-assigned to rams.sep5@gmail.com on first sign-in
-- Movies & actors: use admin panel TMDB sync
-- =============================================================================
