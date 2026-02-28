-- Supabase Advisor fixes (round 3)
--
-- Performance (2 remaining issues):
--   auth.role() has the same auth_rls_initplan problem as auth.uid() —
--   PostgreSQL re-evaluates it for every row. Wrap in (SELECT auth.role()).
--
--   Affected policies:
--     1. sync_logs  — "Authenticated users can insert sync logs"
--     2. audit_log  — "Authenticated users can insert audit logs"
--        (migration 19 fixed auth.uid() here but left auth.role() bare)

-- SYNC_LOGS
DROP POLICY IF EXISTS "Authenticated users can insert sync logs" ON sync_logs;

CREATE POLICY "Authenticated users can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- AUDIT_LOG
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_log;

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND admin_user_id = (SELECT auth.uid())
  );
