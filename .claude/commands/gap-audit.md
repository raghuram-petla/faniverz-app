# Gap Audit

Deep-scan the entire codebase for functional gaps, incomplete features, non-functional code, and code quality issues. Finds and fixes everything in a loop until clean.

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `~/faniverz-worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add ~/faniverz-worktrees/gap-audit-$(date +%s) -b gap-audit-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, quality gates, and commits must happen inside the worktree.** Never modify files in the main working directory.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-fix-verify cycle, immediately start a new scan from Phase 1. Keep looping until **3 consecutive runs find zero gap issues worth fixing**. Track the run counter:

```
Run 1 → found 8 gaps → fix → Run 2 → found 3 gaps → fix → Run 3 → found 0 → Run 4 → found 0 → Run 5 → found 0 → DONE (3 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–4 cycle (scan, report, fix all, verify)
- A "clean run" means Phase 1 found exactly 0 gap issues worth fixing across all 6 categories
- The 3-clean-run counter resets to 0 if any fixable gap is found
- Between runs, print: `### Run N complete — {X gaps fixed | clean} (consecutive clean: M/3)`
- After 3 consecutive clean runs, print: `### Gap Audit complete — 3 consecutive clean runs achieved`

**CRITICAL — No shortcuts allowed:**

- **Every single run MUST perform a full scan.** You MUST actually read source files in every iteration — no skipping, no "the code hasn't changed so it's clean", no assuming previous runs were thorough enough.
- **Launch parallel Explore or general-purpose Agents** for each scan to ensure independent, thorough review. Do not rely on memory of previous runs.
- **Never declare a run "clean" without reading the actual code.** If you cannot prove you read the files in that run, it doesn't count.
- A clean run requires actively scanning and finding nothing — not passively assuming nothing changed.

## Phase 1 — Scan

Search both mobile (`app/`, `src/`) and admin (`admin/src/`) codebases for each category below. For each finding, record: **file path**, **line number(s)**, **what's wrong**, and **severity**. Do NOT modify any files during this phase. Use multiple parallel agents for speed.

### Category 1: Non-Functional Code (Critical)

Code that actively does the wrong thing:

- **Placeholder URLs**: `https://example.com`, `localhost`, or dummy URLs in production code (exclude WebView `baseUrl` and test files)
- **Hardcoded IDs**: UUIDs, user IDs, or video IDs that should come from data
- **Dead handlers**: `onPress` handlers that call `Alert.alert('Coming Soon', ...)` or are empty `() => {}`
- **Nullifying saves**: Code that overwrites existing data with `null` on save operations
- **Missing loading states**: Screens that return `null` when data is loading (should show spinner + back button)

**Approach**: Grep for `example.com`, `localhost`, `Coming Soon`, `=> {}`, `return null`, hardcoded UUID patterns.

### Category 2: Security Issues (Critical)

- **Unprotected edge functions**: Missing JWT/auth verification on Supabase Edge Functions
- **SQL injection / RPC bypass**: `SECURITY DEFINER` functions without `SET search_path`, missing `auth.uid()` NULL checks, missing `REVOKE/GRANT`
- **Missing input validation**: User inputs passed directly to APIs without sanitization
- **Exposed secrets**: API keys, tokens, or credentials in source code (not `.env`)

**Approach**: Read all edge functions and migration files. Grep for `SECURITY DEFINER`, `auth.uid()`, service role patterns.

### Category 3: Missing Functionality (High)

Features that exist in UI but aren't wired to real backend logic:

- **Stub implementations**: Buttons/toggles that use `useState` locally but don't persist to backend
- **Missing API calls**: Forms that don't save, buttons that don't call APIs
- **Broken navigation**: Routes referenced in code but screens don't exist
- **Unregistered tokens**: Push notification setup without token persistence
- **Missing error handling**: Mutations without `onError` callbacks, API calls without try/catch

**Approach**: Search for `useState` + toggle patterns without corresponding API calls. Check all mutation `.mutate()` calls for missing `onError`. Trace navigation routes to verify screens exist.

### Category 4: UX Gaps (Medium)

- **Missing image fallbacks**: `<Image source={{ uri: ... }}` without `?? PLACEHOLDER_*` fallback
- **Missing empty states**: `.map()` on data arrays without corresponding "no items" UI
- **Missing keyboard handling**: Forms without `KeyboardAvoidingView` or `keyboardShouldPersistTaps`
- **Hardcoded strings**: English text not using `useTranslation()` / `t()` when other screens do
- **Inconsistent i18n**: Some screens use translation keys, same strings hardcoded in other screens
- **Missing text truncation**: Dynamic text without `numberOfLines` that could overflow

**Approach**: Grep for `source={{ uri:`, `.map(`, `KeyboardAvoidingView`, `Alert.alert(` with hardcoded strings. Cross-reference with i18n JSON files.

### Category 5: Code Quality (Low)

- **Hardcoded hex colors**: `#FFFFFF`, `#000000`, `#dc2626` etc. in non-style component files (should use `palette.*` or `colors.*` constants)
- **Non-null assertions**: `!` operator on values that could be null (should use `??` fallback)
- **300-line violations**: Source files exceeding the 300-line limit
- **Missing test files**: Source files without corresponding `__tests__/*.test.*` files
- **Unused imports**: Imported symbols that aren't referenced
- **Stale TODO/FIXME/HACK comments**: Markers indicating unfinished work
- **`any` types**: `as any` or explicit `any` annotations that should be specific types

**Approach**: Run `wc -l` audit, grep for `#[0-9a-fA-F]{3,6}` in component files, grep for `TODO|FIXME|HACK`, check for `as any`.

### Category 6: Admin–Mobile Inconsistency (Medium)

- **Missing admin CRUD**: Mobile features that exist but admin can't manage (e.g., can create but not edit)
- **Missing admin error handling**: Admin mutations that swallow errors silently
- **Dashboard gaps**: Data tables or stats that exist but aren't displayed on admin dashboard
- **Missing moderation tools**: User-generated content (reviews, comments) without admin management pages

**Approach**: List all mobile entity types, cross-reference with admin pages. Check each admin mutation for `onError` handling.

## Phase 2 — Report

Present findings as a severity-ranked table:

```
## Gap Audit Report — Run N

### Critical (Active bugs / Security)
| # | Category | File:Line | Issue | Impact |
|---|----------|-----------|-------|--------|

### High (Missing functionality)
| # | Category | File:Line | Issue | Impact |
|---|----------|-----------|-------|--------|

### Medium (UX gaps / Inconsistency)
| # | Category | File:Line | Issue | Impact |
|---|----------|-----------|-------|--------|

### Low (Code quality)
| # | Category | File:Line | Issue | Impact |
|---|----------|-----------|-------|--------|

### Summary
- Critical: X issues
- High: Y issues
- Medium: Z issues
- Low: W issues
- Total: N issues
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL issues across all severity levels, starting with Critical.

## Phase 3 — Fix

Fix all issues in order of severity (Critical → High → Medium → Low).

### Fix Workflow

1. **Group related fixes** — batch fixes that touch the same files together
2. **Fix the code** — apply the minimal change needed
3. **Write/update tests** — for every modified file that requires tests per CLAUDE.md
4. **Run quality gates** after each severity batch:
   - Mobile: `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
   - Admin: `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`
5. **Check 300-line limit** on all modified files
6. **Commit** after each severity batch passes quality gates

### Fix Patterns

- **Hardcoded colors** → Import `colors as palette` from `@/theme/colors` or `@shared/colors`, use `palette.white`, `palette.black`, `palette.red600` etc.
- **Missing placeholders** → Import from `@/constants/placeholders`, use `?? PLACEHOLDER_POSTER` or `?? PLACEHOLDER_AVATAR`
- **Non-null assertions** → Replace `!` with `?? fallbackValue`
- **Missing error handling** → Add `onError` callback or try/catch with user feedback (`Alert.alert` on mobile, `window.alert` on admin)
- **i18n gaps** → Import `useTranslation`, use existing keys from `src/i18n/en.json`, add new keys if needed
- **300-line violations** → Extract components to `src/components/<feature>/` or `admin/src/components/<feature>/` with typed props + test files
- **Security issues** → Add auth checks, `SET search_path`, `REVOKE/GRANT`, input validation. Create new migrations (never modify applied ones).

## Phase 4 — Verify

Run quality gates for each affected codebase:

**Mobile** (if modified):

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

**Admin** (if modified):

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

If any check fails:

1. Read the error output
2. Fix the issue (do not revert the fix unless unfixable)
3. Re-run quality gates to confirm
4. If unfixable, revert the specific fix and note it as infeasible

Also verify:

- All files under 300 lines
- Every new file has a corresponding test file
- All existing tests still pass

Then loop back to Phase 1 with a new scan.

## Final Report

After 3 consecutive clean runs, print:

```
## Gap Audit Summary

### Issues Fixed
| # | Severity | File(s) | Fix Description |
|---|----------|---------|-----------------|

### Quality Gates
- Mobile: PASS/FAIL (X suites, Y tests)
- Admin: PASS/FAIL (X suites, Y tests)
- TSC: 0 errors (both)
- ESLint: 0 errors (both)
- 300-line limit: All files compliant

### New Files
| File | Purpose |
|------|---------|

### New Migrations
| File | Description |
|------|-------------|

### Commits
| Hash | Message |
|------|---------|
```

## Rules

- **No new features** — only complete, fix, or wire up what already exists
- **Minimal changes** — don't refactor surrounding code or add improvements beyond the fix
- **Both codebases** — always check both mobile and admin unless explicitly scoped
- **Never modify applied migrations** — create new migration files
- **Never hardcode localhost/example.com** — use environment variables
- **Every extracted component needs typed props + test file**
- **Mobile mocks**: `jest.mock()`. Admin mocks: `vi.mock()`
- **Admin ESLint**: `--max-warnings 0`. Jest: `--forceExit`
- **Do NOT commit** — leave all changes uncommitted for the user to review.
- **Code-intel annotations** — add `@contract`, `@assumes`, etc. annotations to new/changed code per CLAUDE.md rules.
