-- Add audit triggers to tables that should be audited but are missing them.
-- Only create triggers on tables that actually exist in the database.
-- Uses DO blocks to safely skip tables that haven't been created yet.

DO $$
BEGIN
  -- news_feed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'news_feed') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON news_feed;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON news_feed
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- movie_backdrops
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_backdrops') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON movie_backdrops;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_backdrops
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- movie_keywords
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movie_keywords') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON movie_keywords;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_keywords
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- countries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'countries') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON countries;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON countries
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- languages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'languages') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON languages;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON languages
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- admin_roles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON admin_roles;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_roles
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- admin_user_roles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_user_roles') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON admin_user_roles;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_user_roles
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- admin_ph_assignments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_ph_assignments') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON admin_ph_assignments;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_ph_assignments
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;

  -- admin_invitations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_invitations') THEN
    DROP TRIGGER IF EXISTS audit_trigger ON admin_invitations;
    CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_invitations
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
END $$;
