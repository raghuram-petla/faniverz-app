-- GIN indexes for full-text search (tsvector @@) and fuzzy matching (pg_trgm %).
-- pg_trgm indexes only on short-text columns (titles, names) — not long text (synopsis, body).
-- Long-text fuzzy matching is handled by the tsvector index instead.

-- ── tsvector GIN indexes (full-text @@) ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_movies_search_vector
  ON public.movies USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_actors_search_vector
  ON public.actors USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_production_houses_search_vector
  ON public.production_houses USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_profiles_search_vector
  ON public.profiles USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_reviews_search_vector
  ON public.reviews USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_news_feed_search_vector
  ON public.news_feed USING gin(search_vector);

-- ── pg_trgm GIN indexes (fuzzy %) on short-text columns only ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_movies_title_trgm
  ON public.movies USING gin(title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_movies_director_trgm
  ON public.movies USING gin(director extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_actors_name_trgm
  ON public.actors USING gin(name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_production_houses_name_trgm
  ON public.production_houses USING gin(name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin(display_name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin(username extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_news_feed_title_trgm
  ON public.news_feed USING gin(title extensions.gin_trgm_ops);

-- feed_comments.body — ILIKE-backed search only (no tsvector), pg_trgm index speeds existing ILIKE
CREATE INDEX IF NOT EXISTS idx_feed_comments_body_trgm
  ON public.feed_comments USING gin(body extensions.gin_trgm_ops);
