# DB Change Audit

Ensure every database table that holds admin-managed or user-facing data has a corresponding audit trigger, and that the audit UI (admin panel) can display/revert those changes.

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `.claude/worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add .claude/worktrees/db-audit-$(date +%s) -b db-audit-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, quality gates, and commits must happen inside the worktree.** Never modify files in the main working directory.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-report-fix cycle, immediately start a new scan from Phase 1. Keep looping until **2 consecutive runs find zero issues**. Track the run counter:

```
Run 1 → found 8 gaps → fix → Run 2 → found 2 gaps → fix → Run 3 → found 0 → Run 4 → found 0 → DONE (2 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–4 cycle (scan, report, fix all, quality gates)
- A "clean run" means Phase 1 found exactly 0 issues across all checks
- The 2-clean-run counter resets to 0 if any issues are found
- Between runs, print: `### Run N complete — {X issues found | clean} (consecutive clean: M/2)`
- After 2 consecutive clean runs, print: `### DB Audit complete — 2 consecutive clean runs achieved`

## Phase 1 — Scan

### Step 1: Discover all tables

Scan all migration files in `supabase/migrations/` for `CREATE TABLE` statements. Build a complete list of every table in the database.

### Step 2: Discover all audit triggers

Scan all migration files for `CREATE TRIGGER audit_trigger` statements. Build a list of every table that has the `audit_trigger_fn()` trigger attached. Also check for `DROP TRIGGER` statements that may have removed triggers.

### Step 3: Classify tables

Categorize every table into one of:

| Category              | Description                                                                                                     | Needs audit trigger?                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Admin-managed**     | Tables where admins INSERT/UPDATE/DELETE via the admin panel (movies, actors, platforms, etc.)                  | YES — must have trigger                        |
| **User-generated**    | Tables where users create data (reviews, watchlists, feed_votes, entity_follows, etc.)                          | RECOMMENDED — for moderation visibility        |
| **System/internal**   | Tables that are infrastructure (audit_log, sync_logs, push_tokens, admin_impersonation_sessions)                | NO — skip (auditing the audit log is circular) |
| **RBAC/admin config** | Tables for admin roles and permissions (admin_roles, admin_user_roles, admin_ph_assignments, admin_invitations) | YES — role changes should be audited           |

### Step 4: Cross-reference triggers vs tables

For each table, report whether it has an audit trigger or not. Flag gaps.

### Step 5: Check entity type consistency

Read the audit trigger function (`audit_trigger_fn`) and verify what `entity_type` values it writes (usually `TG_TABLE_NAME`). Then check that the `AUDIT_ENTITY_TYPES` list in `admin/src/lib/types.ts` matches the actual values written by the trigger. Flag mismatches.

### Step 6: Check `auditUtils.ts` entity mapping

Read `admin/src/components/audit/auditUtils.ts` — specifically `getEntityDisplayName()`. Verify that every table with an audit trigger has a case in the switch statement so that audit log entries display meaningful names instead of falling through to the default.

### Step 7: Check audit page filters

Read the audit page (`admin/src/app/(dashboard)/audit/page.tsx`) and the audit hook (`admin/src/hooks/useAdminAudit.ts`). Check if the entity type filter dropdown includes all audited tables.

### Step 8: Check revert support

Read `admin/src/app/api/audit/revert/route.ts`. Check which entity types support revert and flag any audited tables that can't be reverted.

## Phase 2 — Report

Present findings as:

```
## DB Audit Coverage Report — Run N

### Tables Missing Audit Triggers
| # | Table | Category | Risk | Notes |
|---|-------|----------|------|-------|

### Entity Type Mismatches
| # | Actual DB Value | UI Filter Value | Issue |
|---|----------------|-----------------|-------|

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
- Entity type mismatches: N
- UI coverage gaps: N
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL issues.

## Phase 3 — Fix

For each gap, apply fixes in order:

### Fix 1: Add missing audit triggers

Create a NEW migration file (never modify applied migrations). Follow the existing pattern:

```sql
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON <table_name>
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

Check migration numbering — look at the latest migration file number and increment. Use `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` for safety.

### Fix 2: Fix entity type mismatches

If the `AUDIT_ENTITY_TYPES` list doesn't match the actual values written by the trigger, update it to use the correct values.

### Fix 3: Update `getEntityDisplayName()`

Add cases to the switch statement for any new audited tables. Pick the most human-readable field (e.g., `title`, `name`, `email`, `display_name`).

### Fix 4: Update audit page filters

Add missing entity types to the filter dropdown so admins can filter audit logs by the new tables.

### Fix 5: Update revert support (if applicable)

For admin-managed tables, add revert support in the revert API route. For user-generated tables, revert may not be appropriate — note this in the report.

### Fix 6: Write/update tests

- Update `admin/src/__tests__/components/audit/auditUtils.test.ts` for new entity types
- Update any audit hook tests if the filter options change

### Fix 7: Quality gates

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

## Phase 4 — Final Report (per run)

```
## DB Audit Fix Summary — Run N

### Issues Fixed
| # | Category | File(s) | Issue | Fix |
|---|----------|---------|-------|-----|

### New Migration (if any)
| File | Description |
|------|-------------|

### Quality Gates
- Admin: PASS/FAIL (X suites, Y tests)
- TSC: 0 errors
- ESLint: 0 errors
```

Then immediately proceed to Run N+1 (back to Phase 1).

## Rules

- **Never modify applied migrations** — always create a new migration file
- **Don't add triggers to `audit_log` or `sync_logs`** — auditing the audit system is circular
- **Don't add triggers to `push_tokens`** — high-frequency system table, not admin-managed
- **Check for `IF NOT EXISTS` or `DROP TRIGGER IF EXISTS`** patterns when adding triggers to tables that might already have them from a later migration
- **The `audit_trigger_fn()` function already exists** — just attach it to new tables
- **Minimal changes only** — don't refactor the audit system, just ensure coverage
- **Entity type values must match** — the trigger writes `TG_TABLE_NAME` (the actual PostgreSQL table name). The UI filter list must use these exact same values.
- **Both codebases** — always check admin panel code for UI coverage
- **Admin ESLint**: `--max-warnings 0`
