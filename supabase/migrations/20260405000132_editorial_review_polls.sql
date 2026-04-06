-- Editorial review polls: agree/disagree votes on editorial ratings.
-- Separate from feed_votes (which express content quality, not agreement with opinion).

CREATE TABLE editorial_review_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editorial_review_id uuid NOT NULL REFERENCES editorial_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('agree', 'disagree')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editorial_review_polls_unique UNIQUE (editorial_review_id, user_id)
);

ALTER TABLE editorial_review_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poll votes" ON editorial_review_polls FOR SELECT USING (true);
CREATE POLICY "Users insert own poll votes" ON editorial_review_polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own poll votes" ON editorial_review_polls FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own poll votes" ON editorial_review_polls FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_editorial_polls_review ON editorial_review_polls (editorial_review_id, vote);
CREATE INDEX idx_editorial_polls_user ON editorial_review_polls (user_id);

-- Trigger to maintain agree_count/disagree_count on editorial_reviews
CREATE OR REPLACE FUNCTION update_editorial_poll_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 'agree' THEN
      UPDATE public.editorial_reviews SET agree_count = agree_count + 1 WHERE id = NEW.editorial_review_id;
    ELSE
      UPDATE public.editorial_reviews SET disagree_count = disagree_count + 1 WHERE id = NEW.editorial_review_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.vote = 'agree' THEN
      UPDATE public.editorial_reviews SET agree_count = GREATEST(0, agree_count - 1) WHERE id = OLD.editorial_review_id;
    ELSE
      UPDATE public.editorial_reviews SET disagree_count = GREATEST(0, disagree_count - 1) WHERE id = OLD.editorial_review_id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.vote IS DISTINCT FROM NEW.vote THEN
    IF OLD.vote = 'agree' THEN
      UPDATE public.editorial_reviews SET agree_count = GREATEST(0, agree_count - 1), disagree_count = disagree_count + 1 WHERE id = NEW.editorial_review_id;
    ELSE
      UPDATE public.editorial_reviews SET disagree_count = GREATEST(0, disagree_count - 1), agree_count = agree_count + 1 WHERE id = NEW.editorial_review_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_editorial_poll_counts
  AFTER INSERT OR UPDATE OR DELETE ON editorial_review_polls
  FOR EACH ROW EXECUTE FUNCTION update_editorial_poll_counts();
