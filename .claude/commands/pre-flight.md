# Pre-Flight Check

Run this automated checklist before committing any changes. This catches the most common issues found across 60+ sessions.

## Step 1 — Uncommitted File Audit

```bash
git status
```

List ALL modified, added, and untracked files. For each file, classify it:

- **Should commit**: Part of the current task
- **Should not commit**: Unrelated changes (flag to user)
- **Should delete**: Temporary/debug files

If there are unrelated uncommitted changes, **warn the user** before proceeding.

## Step 2 — 300-Line Limit Check

```bash
find . \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/scripts/*" \
  -not -name "*.d.ts" \
  -not -name "*.config.*" \
  -not -name "jest.setup*" \
  -not -path "*/__tests__/*" \
  -not -name "*.test.*" \
  -not -name "*.styles.*" \
  -print0 \
  | xargs -0 wc -l 2>/dev/null \
  | sort -rn \
  | awk '$1 > 300 { if ($0 ~ /total/) next; print }'
```

If any file exceeds 300 lines, **stop and refactor** before continuing.

## Step 3 — Missing Test Files

For each modified/new source file (excluding exempt files), verify a corresponding test file exists:

```bash
# Get list of modified source files
git diff --name-only HEAD | grep -E '\.(ts|tsx)$' | grep -v -E '(__tests__|\.test\.|\.styles\.|\.config\.|\.d\.ts|jest\.setup|scripts/)'
```

For each file, check if `__tests__/<filename>.test.tsx` or `__tests__/<filename>.test.ts` exists. Flag any missing test files.

## Step 4 — Null/Undefined/Empty State Check

For each modified component file, grep for potential issues:

- Images without fallback: Look for `<Image source=` without a fallback/placeholder
- Undefined displays: Look for string interpolation `${` without null coalescing `??`
- Missing empty states: Look for `.map(` without a corresponding empty state check

Flag potential issues for manual review.

## Step 5 — Global Change Completeness

If the current changes modify text strings, colors, or patterns that should be consistent across the app:

1. Identify the old pattern being replaced
2. `grep -r` the ENTIRE codebase for remaining instances
3. Report any files that still contain the old pattern

## Step 6 — Theme Consistency

For each modified component with color/style changes:

1. Check if both dark and light theme variants are handled
2. Look for hardcoded colors (hex values, `rgb()`) that should use theme tokens
3. Flag any `#` color values in JSX that aren't in a `.styles.ts` file

## Step 7 — Admin Panel Inclusion

If changes were made to mobile (`app/` or `src/`), check if equivalent admin changes are needed:

1. Was a new data field added? → Check if admin forms display/edit it
2. Was display logic changed? → Check if admin preview reflects the same logic
3. Was a bug fixed? → Check if the same bug exists in admin

Report whether admin changes are needed.

## Step 8 — Quality Gates

Run the quality gates for each affected codebase:

**If mobile files were modified:**

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

**If admin files were modified:**

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
