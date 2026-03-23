-- Add audit triggers to tables that should be audited but are missing them.
-- Admin-managed tables: news_feed, movie_backdrops, movie_keywords, countries, languages
-- RBAC tables: admin_roles, admin_user_roles, admin_ph_assignments, admin_invitations

-- Admin-managed tables
DROP TRIGGER IF EXISTS audit_trigger ON news_feed;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON news_feed
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON movie_backdrops;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_backdrops
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON movie_keywords;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON movie_keywords
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON countries;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON countries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON languages;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON languages
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- RBAC tables
DROP TRIGGER IF EXISTS audit_trigger ON admin_roles;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON admin_user_roles;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON admin_ph_assignments;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_ph_assignments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_trigger ON admin_invitations;
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON admin_invitations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
