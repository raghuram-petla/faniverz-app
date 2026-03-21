# Review and Fix

Code review and fix cycle that operates **only on uncommitted changes**. Scans staged and unstaged modifications for bugs, anti-patterns, logic errors, and code quality issues — then fixes them.

## Scope — Uncommitted Changes Only

Before starting, run `git diff --name-only` and `git diff --cached --name-only` to get the list of modified files. **Only review and fix these files.** Ignore all other files in the codebase. If there are no uncommitted changes, print `### No uncommitted changes found — nothing to review` and stop.

For each modified file, also run `git diff <file>` and `git diff --cached <file>` to get the actual diff. Focus your review on the **changed lines and their immediate context** (surrounding function/block), not the entire file.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-report-fix cycle, immediately start a new scan from Phase 1. Keep looping until **3 consecutive runs find zero issues**. Track the run counter:

```
Run 1 → found 8 issues → fix → Run 2 → found 2 issues → fix → Run 3 → found 0 → Run 4 → found 0 → Run 5 → found 0 → DONE (3 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–3 cycle (scan, report, fix all)
- A "clean run" means Phase 1 found exactly 0 issues across all categories
- The 3-clean-run counter resets to 0 if any issues are found
- Between runs, re-run `git diff --name-only` and `git diff --cached --name-only` to pick up files changed by fixes
- Between runs, print: `### Run N complete — {X issues found | clean} (consecutive clean: M/3)`
- After 3 consecutive clean runs, print: `### Review and Fix complete — 3 consecutive clean runs achieved`

**CRITICAL — No shortcuts allowed:**

- **Every single run MUST perform a full scan.** You MUST actually read the diffs and source files in every iteration — no skipping, no "the code hasn't changed so it's clean", no assuming previous runs were thorough enough.
- **Launch an Explore or general-purpose Agent** for each clean-run scan to ensure independent, thorough review. Do not rely on memory of previous runs.
- **Never declare a run "clean" without reading the actual code.** If you cannot prove you read the diffs in that run, it doesn't count.
- A clean run requires actively scanning and finding nothing — not passively assuming nothing changed.

## Phase 1 — Scan

Read the diffs and modified files. For each finding, record: **file path**, **line number(s)**, **what's wrong**, **severity**, and **how to fix**. Do NOT modify any files during this phase.

### What to Look For

#### Critical

- **Null/undefined crashes**: Missing optional chaining, array methods on potentially undefined values, destructuring undefined, unchecked Supabase `.data` access
- **Async bugs**: Missing `await`, unhandled promise rejections, race conditions in effects, missing abort controllers
- **Logic errors**: Inverted conditions, wrong boolean logic (`&&` vs `||`), wrong variable used (copy-paste errors), wrong comparison operators, off-by-one errors
- **Security issues**: SQL injection, XSS, hardcoded secrets, exposed API keys, unsafe `eval` / `dangerouslySetInnerHTML` with user input

#### High

- **React hook violations**: Missing/wrong effect dependencies, conditional hooks, hooks after early return, missing cleanup
- **State bugs**: Direct state mutation, stale closures, wrong default values, type coercion traps (`if (count)` where 0 is valid)
- **Data flow errors**: Wrong spread order, wrong sort direction, string/number confusion in comparisons
- **Supabase issues**: Missing `.single()`, missing error checks, missing WHERE on update/delete, missing `.select()` on insert/update
- **Missing error handling**: try/catch missing around operations that can fail, unhandled rejection paths

#### Medium

- **Performance**: Expensive inline computations without `useMemo`, unstable references causing re-renders, missing debounce on search/filter
- **UI bugs**: Image without dimensions, FlatList without `keyExtractor`, missing loading/error states, broken dark/light theme support
- **Admin-specific**: Missing `'use client'`, server/client mismatch, missing form validation, missing `useUnsavedChangesWarning`

#### Low

- **Code quality**: Unnecessary wrapper functions (`() => fn()` where `fn` suffices), redundant memoization of trivial ops, dead code in the diff, unused imports added by the change
- **Consistency**: Naming inconsistencies with surrounding code, style violations, missing TypeScript types on new code

### Approach

1. **Run `git diff -- <file>` for every modified source file** — you must actually read each diff, not summarize from memory
2. **Read each modified file fully** to understand context — use the Read tool or an Agent, not assumptions
3. Focus review on changed lines but flag issues in surrounding code only if the change **introduced or exposed** them
4. Cross-reference changes across files (e.g., if a hook signature changed, check all callsites in the diff)
5. **For clean runs (consecutive clean counting):** Launch an Agent with `subagent_type=Explore` or `subagent_type=general-purpose` to independently verify the code is clean. The agent must read the actual diffs and report findings. You cannot self-certify a clean run without tool-verified evidence.

## Phase 2 — Report

Present findings as a severity-ranked table:

```
## Code Review Report (Run N)

### Files Reviewed
- `path/to/file1.ts` (M lines changed)
- `path/to/file2.tsx` (N lines changed)

### Issues Found

#### Critical
| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|

#### High
| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|

#### Medium
| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|

#### Low
| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|

### Summary
- Critical: X | High: Y | Medium: Z | Low: W | Total: N
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL issues.

## Phase 3 — Fix

Fix all issues in order of severity (Critical first).

### Fix Workflow

1. **Group related fixes** — batch fixes that touch the same file together
2. **Fix the issue** — apply the minimal, correct fix
3. **Write/update tests** — add or update tests covering the fixed behavior
4. **Run quality gates** after all fixes:
   - Mobile (if mobile files changed): `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
   - Admin (if admin files changed): `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`
5. **Check 300-line limit** on all modified files
6. **Do NOT commit** — leave changes uncommitted for the user to review

After fixing, loop back to Phase 1 with a new scan of the updated uncommitted changes.

## Final Report

After 3 consecutive clean runs, print:

```
## Review and Fix Summary

### Issues Fixed (across all runs)
| # | Severity | File(s) | Issue | Fix Applied |
|---|----------|---------|-------|-------------|

### Tests Added/Updated
| Test File | What It Covers |
|-----------|---------------|

### Quality Gates
- Mobile: PASS/FAIL (X suites, Y tests)
- Admin: PASS/FAIL (X suites, Y tests)
- 300-line limit: All files compliant

### Stats
- Total runs: N
- Total issues found and fixed: M
```

## Rules

- **Only uncommitted changes** — never review or fix code outside the current diff
- **No new features** — only fix issues found in the review
- **Minimal fixes** — don't refactor surrounding code beyond the issue
- **Both codebases** — review both mobile and admin changes in the diff
- **Tests required** — every fix must include a test
- **Never modify applied migrations** — create new migration files for DB fixes
- **Mobile mocks**: `jest.mock()`. Admin mocks: `vi.mock()`
- **Admin ESLint**: `--max-warnings 0`. Jest: `--forceExit`
- **Don't commit** — leave all changes staged/unstaged for user review
- **Code-intel annotations** — add `@contract`, `@assumes`, etc. annotations to fixed code per CLAUDE.md rules
