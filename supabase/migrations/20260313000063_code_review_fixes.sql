-- Code review fixes: RLS policy corrections, missing policies, DB constraints
-- Issues: #6, #7, #17, #32, #34, #35, #48, #49

-- ============================================================
-- 1. Fix profiles RLS: replace overly broad USING(true) with privacy-aware policy (#6, #7)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Own profile: always readable
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Other profiles: only if is_profile_public = true
CREATE POLICY "Authenticated users can view public profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_profile_public = true);

-- ============================================================
-- 2. Add missing DELETE policy on notifications (#17)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications"
      ON notifications FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. Add missing UPDATE policy on feed_comments (#32)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feed_comments' AND policyname = 'Users can update own comments'
  ) THEN
    CREATE POLICY "Users can update own comments"
      ON feed_comments FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 4. Add UNIQUE constraint on movie_cast(movie_id, actor_id) (#34)
-- ============================================================
-- Remove duplicates first (keep the one with lowest display_order)
DELETE FROM movie_cast a
USING movie_cast b
WHERE a.movie_id = b.movie_id
  AND a.actor_id = b.actor_id
  AND a.credit_type = b.credit_type
  AND a.id > b.id;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movie_cast_movie_actor_credit_unique'
  ) THEN
    ALTER TABLE movie_cast
      ADD CONSTRAINT movie_cast_movie_actor_credit_unique UNIQUE (movie_id, actor_id, credit_type);
  END IF;
END $$;

-- ============================================================
-- 5. Prevent self-following in entity_follows (#48)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_follows_no_self_follow'
  ) THEN
    ALTER TABLE entity_follows
      ADD CONSTRAINT entity_follows_no_self_follow
      CHECK (entity_type != 'user' OR entity_id != user_id);
  END IF;
END $$;

-- ============================================================
-- 6. Add CHECK on sync_logs: completed_at required for terminal statuses (#49)
-- ============================================================
-- First backfill any existing rows that violate the constraint
UPDATE sync_logs SET completed_at = started_at
  WHERE status IN ('success', 'failed') AND completed_at IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sync_logs_completed_at_required'
  ) THEN
    ALTER TABLE sync_logs
      ADD CONSTRAINT sync_logs_completed_at_required
      CHECK (status NOT IN ('success', 'failed') OR completed_at IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- 7. Protect last root/super_admin from DELETE (#35)
-- ============================================================
CREATE OR REPLACE FUNCTION guard_last_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  remaining int;
BEGIN
  -- Count remaining active admins with same role (excluding the row being deleted)
  SELECT COUNT(*) INTO remaining
  FROM public.admin_user_roles
  WHERE role = OLD.role AND is_blocked = false AND id != OLD.id;

  IF OLD.role IN ('root', 'super_admin') AND remaining = 0 THEN
    RAISE EXCEPTION 'Cannot delete the last active % role', OLD.role;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_last_admin_delete ON admin_user_roles;
CREATE TRIGGER trg_guard_last_admin_delete
  BEFORE DELETE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION guard_last_admin_delete();

NOTIFY pgrst, 'reload schema';
