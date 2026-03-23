# Pre-Flight Check

Run this automated checklist before committing any changes. This catches the most common issues found across 60+ sessions.

## Critical: Scope Control

**Only check files modified in the CURRENT Claude session.** The user works with multiple Claude sessions on a single branch, so there may be uncommitted changes from other sessions that do NOT belong to this session's scope.

You MUST:

1. Review the conversation history to identify exactly which files YOU created, modified, or deleted in this session
2. Only run checks against those specific files
3. If `git status` shows other uncommitted changes, IGNORE them — they belong to another session
4. Store the session file list and reuse it across all steps below

## Step 1 — Build Session File List

Review the conversation history and build an explicit list of files you touched in this session. Then run:

```bash
git status
```

Cross-reference `git status` output with your session file list. For files YOU touched, classify them:

- **Should commit**: Part of the current task
- **Should not commit**: Accidental/debug changes (flag to user)
- **Should delete**: Temporary/debug files

Any other uncommitted changes are out of scope — note them but do not check or flag them.

## Step 2 — 300-Line Limit Check

Check ONLY the session files (excluding exempt categories) for the 300-line limit:

```bash
wc -l <session-file-1> <session-file-2> ... | sort -rn | awk '$1 > 300 { if ($0 ~ /total/) next; print }'
```

Skip files matching exempt patterns: `*.styles.*`, `*.test.*`, `__tests__/*`, `*.config.*`, `*.d.ts`, `jest.setup*`, `scripts/*`.

If any file exceeds 300 lines, **stop and refactor** before continuing.

## Step 3 — Missing Test Files

For each session source file (excluding exempt files), verify a corresponding test file exists.

Skip: test files, style files, config files, type-only files, scripts, barrel exports.

For each remaining file, check if `__tests__/<filename>.test.tsx` or `__tests__/<filename>.test.ts` exists. Flag any missing test files.

## Step 4 — Null/Undefined/Empty State Check

For each session component file, grep for potential issues:

- Images without fallback: Look for `<Image source=` without a fallback/placeholder
- Undefined displays: Look for string interpolation `${` without null coalescing `??`
- Missing empty states: Look for `.map(` without a corresponding empty state check

Flag potential issues for manual review.

## Step 5 — Global Change Completeness

If the session changes modify text strings, colors, or patterns that should be consistent across the app:

1. Identify the old pattern being replaced
2. `grep -r` the ENTIRE codebase for remaining instances
3. Report any files that still contain the old pattern

## Step 6 — Theme Consistency

For each session component with color/style changes:

1. Check if both dark and light theme variants are handled
2. Look for hardcoded colors (hex values, `rgb()`) that should use theme tokens
3. Flag any `#` color values in JSX that aren't in a `.styles.ts` file

## Step 7 — Admin Panel Inclusion

If session changes were made to mobile (`app/` or `src/`), check if equivalent admin changes are needed:

1. Was a new data field added? → Check if admin forms display/edit it
2. Was display logic changed? → Check if admin preview reflects the same logic
3. Was a bug fixed? → Check if the same bug exists in admin

Report whether admin changes are needed.

## Step 8 — Quality Gates

Run the quality gates based on which codebases your session files belong to:

**If any session files are in mobile (`app/` or `src/`):**

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

**If any session files are in admin (`admin/`):**

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

## Step 9 — Migration Safety

If any new migration files were created:

1. Check that the migration number doesn't conflict with existing files
2. Verify `IF NOT EXISTS` / `IF EXISTS` guards are used for idempotency
3. Confirm no `localhost` URLs are hardcoded in the migration
4. Verify the migration was applied locally: `supabase migration up`

## Step 10 — Final Report

Present a summary table:

```
## Pre-Flight Report

| Check | Status | Details |
|-------|--------|---------|
| Uncommitted files | PASS/WARN | X files modified, Y untracked |
| 300-line limit | PASS/FAIL | List violations |
| Test coverage | PASS/FAIL | List missing test files |
| Null/empty safety | PASS/WARN | List potential issues |
| Global consistency | PASS/WARN | List remaining old patterns |
| Theme support | PASS/WARN | List hardcoded colors |
| Admin inclusion | PASS/N/A | Admin changes needed? |
| Quality gates | PASS/FAIL | ESLint + TSC + Tests |
| Migration safety | PASS/N/A | Conflicts? Applied? |
```

Only proceed with commit if all critical checks (300-line, tests, quality gates) PASS.
