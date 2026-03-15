# DB Change Audit

Ensure every database table that holds admin-managed or user-facing data has a corresponding audit trigger, and that the audit UI (admin panel) can display/revert those changes.

## Phase 1 — Inventory

### Step 1: Discover all tables

Scan all migration files in `supabase/migrations/` for `CREATE TABLE` statements. Build a complete list of every table in the database.

### Step 2: Discover all audit triggers

Scan all migration files for `CREATE TRIGGER audit_trigger` statements. Build a list of every table that has the `audit_trigger_fn()` trigger attached.

### Step 3: Classify tables

Categorize every table into one of:

| Category              | Description                                                                                                     | Needs audit trigger?                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Admin-managed**     | Tables where admins INSERT/UPDATE/DELETE via the admin panel (movies, actors, platforms, etc.)                  | YES — must have trigger                        |
| **User-generated**    | Tables where users create data (reviews, watchlists, feed_votes, entity_follows, etc.)                          | RECOMMENDED — for moderation visibility        |
| **System/internal**   | Tables that are infrastructure (audit_log, sync_logs, push_tokens, admin_impersonation_sessions)                | NO — skip (auditing the audit log is circular) |
| **RBAC/admin config** | Tables for admin roles and permissions (admin_roles, admin_user_roles, admin_ph_assignments, admin_invitations) | YES — role changes should be audited           |

### Step 4: Cross-reference

For each table, report whether it has an audit trigger or not. Flag gaps.

## Phase 2 — Audit UI Coverage

### Step 5: Check `auditUtils.ts` entity mapping

Read `admin/src/components/audit/auditUtils.ts` — specifically `getEntityDisplayName()`. Verify that every table with an audit trigger has a case in the switch statement so that audit log entries display meaningful names instead of falling through to the default.

### Step 6: Check audit page filters

Read the audit page (`admin/src/app/(dashboard)/audit/page.tsx`) and the audit hook (`admin/src/hooks/useAdminAudit.ts`). Check if the entity type filter dropdown includes all audited tables.

### Step 7: Check revert support

Read `admin/src/app/api/audit/revert/route.ts`. Check which entity types support revert and flag any audited tables that can't be reverted.

## Phase 3 — Report

Present findings as:

```
## DB Audit Coverage Report

### Tables Missing Audit Triggers
| # | Table | Category | Risk | Notes |
|---|-------|----------|------|-------|

### Tables With Triggers But Missing UI Support
| # | Table | Missing From | Issue |
|---|-------|-------------|-------|

### Audit UI Gaps
| # | Component | Issue |
|---|-----------|-------|

### Summary
- Total tables: X
- With audit triggers: Y
- Missing triggers (should have): Z
- System/exempt tables: W
- UI coverage gaps: N
```

**Wait for user confirmation before proceeding to Phase 4.**

## Phase 4 — Fix

For each gap, apply fixes in order:

### Fix 1: Add missing audit triggers

Create a NEW migration file (never modify applied migrations). Follow the existing pattern:

```sql
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON <table_name>
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

Check migration numbering — look at the latest migration file number and increment.

### Fix 2: Update `getEntityDisplayName()`

Add cases to the switch statement for any new audited tables. Pick the most human-readable field (e.g., `title`, `name`, `email`, `display_name`).

### Fix 3: Update audit page filters

Add missing entity types to the filter dropdown so admins can filter audit logs by the new tables.

### Fix 4: Update revert support (if applicable)

For admin-managed tables, add revert support in the revert API route. For user-generated tables, revert may not be appropriate — note this in the report.

### Fix 5: Write/update tests

- Update `admin/src/__tests__/components/audit/auditUtils.test.ts` for new entity types
- Update any audit hook tests if the filter options change

### Fix 6: Quality gates

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

## Phase 5 — Final Report

```
## DB Audit Fix Summary

### Triggers Added
| # | Table | Category |
|---|-------|----------|

### UI Updates
| # | File | Change |
|---|------|--------|

### New Migration
| File | Description |
|------|-------------|

### Quality Gates
- Admin: PASS/FAIL (X suites, Y tests)
- TSC: 0 errors
- ESLint: 0 errors
```

## Rules

- **Never modify applied migrations** — always create a new migration file
- **Don't add triggers to `audit_log` or `sync_logs`** — auditing the audit system is circular
- **Don't add triggers to `push_tokens`** — high-frequency system table, not admin-managed
- **Check for `IF NOT EXISTS` or `DROP TRIGGER IF EXISTS`** patterns when adding triggers to tables that might already have them from a later migration
- **The `audit_trigger_fn()` function already exists** — just attach it to new tables
- **Minimal changes only** — don't refactor the audit system, just ensure coverage
