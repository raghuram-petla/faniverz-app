-- ==============================================
-- RLS POLICIES FOR ALL TABLES
-- ==============================================

-- Force RLS on all tables
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platforms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.movies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.movie_cast FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ott_releases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue FORCE ROW LEVEL SECURITY;

-- ==============================================
-- PROFILES: public read, self update
-- ==============================================
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================
-- PLATFORMS: public read, no user writes
-- ==============================================
CREATE POLICY "platforms_select_all" ON public.platforms
  FOR SELECT USING (true);

-- ==============================================
-- MOVIES: public read, no user writes
-- ==============================================
CREATE POLICY "movies_select_all" ON public.movies
  FOR SELECT USING (true);

-- ==============================================
-- MOVIE_CAST: public read, no user writes
-- ==============================================
CREATE POLICY "movie_cast_select_all" ON public.movie_cast
  FOR SELECT USING (true);

-- ==============================================
-- OTT_RELEASES: public read, no user writes
-- ==============================================
CREATE POLICY "ott_releases_select_all" ON public.ott_releases
  FOR SELECT USING (true);

-- ==============================================
-- WATCHLISTS: users manage their own
-- ==============================================
CREATE POLICY "watchlists_select_own" ON public.watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlists_insert_own" ON public.watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlists_delete_own" ON public.watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- REVIEWS: users manage their own, public read
-- ==============================================
CREATE POLICY "reviews_select_all" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- PUSH_TOKENS: users manage their own
-- ==============================================
CREATE POLICY "push_tokens_select_own" ON public.push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own" ON public.push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own" ON public.push_tokens
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own" ON public.push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- NOTIFICATION_QUEUE: users read own, system writes
-- ==============================================
CREATE POLICY "notification_queue_select_own" ON public.notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- ==============================================
-- STORAGE BUCKETS
-- ==============================================

-- Avatars bucket: public read, authenticated upload to own user ID prefix
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Movie images bucket: public read, admin-only upload (admin write added in FAN-088)
INSERT INTO storage.buckets (id, name, public) VALUES ('movie-images', 'movie-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "movie_images_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'movie-images');
