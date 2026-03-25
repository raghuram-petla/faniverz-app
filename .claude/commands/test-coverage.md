# Test Coverage

Find and fix test coverage gaps in a loop across mobile (`app/`, `src/`) and admin (`admin/src/`). Runs until **3 consecutive cycles find 0 gaps**.

## Loop Mode

Each "cycle" consists of: scan → report → write tests → add ignore comments for unreachable branches → verify. Keep looping until **3 consecutive cycles find zero coverage gaps**.

```
Cycle 1 → 12 missing tests → write them → Cycle 2 → 3 gaps → fix → Cycle 3 → 0 gaps → Cycle 4 → 0 gaps → Cycle 5 → 0 gaps → DONE
```

**Rules for loop mode:**

- Each cycle is a full Phase 1–4 pass (scan, report, write, verify)
- A "clean cycle" means Phase 1 found exactly 0 missing test files AND 0 files below coverage thresholds (after accounting for coverage ignore comments on genuinely unreachable branches)
- The 3-clean-cycle counter resets to 0 if any gaps are found
- Between cycles, print: `### Cycle N complete — {X gaps found | clean} (consecutive clean: M/3)`
- After 3 consecutive clean cycles, print: `### Test Coverage complete — 3 consecutive clean cycles achieved`

**CRITICAL — No shortcuts allowed:**

- **Every single cycle MUST perform a full scan.** You MUST actually find source files, check for test files, and read test content in every iteration — no skipping, no "nothing changed so it's clean", no assuming previous cycles were thorough enough.
- **Launch Explore or general-purpose Agents** for each scan to ensure independent, thorough review. Do not rely on memory of previous cycles.
- **Never declare a cycle "clean" without tool-backed evidence** (Agent output showing files scanned, Read/Grep/Glob tool calls).
- A clean cycle requires actively scanning and finding nothing — not passively assuming nothing changed.
- **Do not batch consecutive clean declarations.** Each clean cycle must be a separate, verifiable scan.
- **Each cycle's agents start fresh** — do not rely on memory of previous cycles' findings.

## Coverage Thresholds

All source files must meet these minimum thresholds. Files below these numbers are treated as gaps, even if a test file exists.

| Metric         | Minimum |
| -------------- | ------- |
| **Lines**      | 100%    |
| **Branches**   | 100%    |
| **Functions**  | 100%    |
| **Statements** | 100%    |

A file that has a test but falls below ANY of these thresholds is a gap that must be fixed.

## Phase 1 — Scan for Coverage Gaps

Find all source files missing tests AND files with incomplete test coverage. Do NOT modify any files during this phase.

### Step 1A — Run coverage reports

Run coverage tools to get **per-file** metrics. This is the primary data source for finding gaps.

**Mobile:**

```bash
npx jest --silent --forceExit --maxWorkers=2 --coverage --coverageReporters=json-summary --coverageDirectory=./coverage 2>&1
```

Then read `./coverage/coverage-summary.json` to extract per-file line/branch/function/statement percentages.

**Admin:**

```bash
cd admin && npx vitest run --maxWorkers=2 --coverage --coverage.reporter=json-summary 2>&1
```

Then read `admin/coverage/coverage-summary.json` to extract per-file metrics.

Parse the JSON to identify:

- Files with **0% coverage** (test file likely missing)
- Files **below thresholds** (test file exists but incomplete)
- Files **meeting all thresholds** (no action needed)

### Step 1B — Check for missing test files

For any file not appearing in coverage reports (not instrumented), fall back to the file-existence scan:

### What must have tests

- All `.ts` and `.tsx` files under `app/`, `src/`, and `admin/src/`

### What's exempt

- Style files (`*.styles.ts`) — no logic to test
- Type-only files (`types.ts`, `*.d.ts`) — no runtime behavior
- Config files (`*.config.*`, `jest.setup*`)
- Barrel files (`index.ts` with only re-exports)
- Seed/migration scripts (`scripts/`, `supabase/`)
- Auto-generated files (`.next/`, `.expo/`)

### Test file location conventions

**Mobile**:

- `app/<route>/<file>.tsx` → `app/<route>/__tests__/<file>.test.tsx`
- `app/(tabs)/<file>.tsx` → `app/(tabs)/__tests__/<file>.test.tsx`
- `src/components/<feature>/<Component>.tsx` → `src/components/<feature>/__tests__/<Component>.test.tsx`
- `src/hooks/<hook>.ts` → `src/hooks/__tests__/<hook>.test.ts`
- `src/features/<feature>/<module>.ts` → `src/features/<feature>/__tests__/<module>.test.ts`
- `src/utils/<util>.ts` → `src/utils/__tests__/<util>.test.ts`
- `src/constants/<const>.ts` → `src/constants/__tests__/<const>.test.ts`

**Admin**:

- `admin/src/components/<feature>/<Component>.tsx` → `admin/src/components/<feature>/__tests__/<Component>.test.tsx`
- `admin/src/hooks/<hook>.ts` → `admin/src/hooks/__tests__/<hook>.test.ts`
- `admin/src/app/**/page.tsx` → `admin/src/app/**/__tests__/page.test.tsx`
- `admin/src/app/**/layout.tsx` → `admin/src/app/**/__tests__/layout.test.tsx`
- `admin/src/lib/<module>.ts` → `admin/src/__tests__/lib/<module>.test.ts`
- `admin/src/app/api/**/*.ts` → `admin/src/__tests__/api/**/*.test.ts`

### How to find missing tests

```bash
find . \( -name '*.ts' -o -name '*.tsx' \) \
  ! -path '*/node_modules/*' ! -path '*/.next/*' ! -path '*/.expo/*' \
  ! -path '*/__tests__/*' ! -name '*.test.*' ! -name '*.d.ts' \
  ! -name '*.config.*' ! -name 'jest.setup*' ! -path '*/scripts/*' \
  ! -path '*/supabase/*' ! -name '*.styles.*' \
  | sort
```

For each file, check whether a test file exists at the expected location. If not, record it as missing.

**Skip barrel files**: Read the file — if it contains only `export ... from` re-exports with no logic, mark as exempt.

**Skip type-only files**: If the file contains only `type`, `interface`, or `enum` exports with no functions/components, mark as exempt.

### Step 1C — Analyze coverage gaps

For files that have tests but are below thresholds, identify WHAT is uncovered using the coverage data:

- Which functions have 0% or low coverage?
- Which branches are missed?
- Which line ranges are uncovered?

Use this data to write targeted tests in Phase 3 rather than guessing from code inspection alone.

### Approach

Launch **at least 2 parallel agents** (one for mobile, one for admin) with explicit directory assignments so each area gets independent coverage. Each agent must use Read/Grep/Glob tools to verify findings — not assumptions.

## Phase 2 — Report

Present findings as markdown tables, **sorted by coverage percentage ascending** (worst coverage first):

```
## Test Coverage Report (Cycle N)

### Coverage Summary
| Codebase | Statements | Branches | Functions | Lines |
|----------|-----------|----------|-----------|-------|
| Mobile   | XX.XX%    | XX.XX%   | XX.XX%    | XX.XX%|
| Admin    | XX.XX%    | XX.XX%   | XX.XX%    | XX.XX%|

### Missing Test Files (X found)
| Source File | Expected Test Path | File Type |
|-------------|-------------------|-----------|

### Files Below Coverage Thresholds (X found)
| Source File | Lines | Branches | Functions | Stmts | Worst Gap |
|-------------|-------|----------|-----------|-------|-----------|

### Summary
- Files with tests: X / Y (Z%)
- Files meeting all thresholds: A
- Files below thresholds: B (need more tests)
- Files with no tests: C
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and write ALL missing tests.

## Phase 3 — Write Tests

Write tests for all gaps found in Phase 1, **prioritized by lowest coverage first** (biggest impact per test written):

1. **Files with 0% coverage** — missing test files entirely
2. **Files below 50% line coverage** — critical gaps
3. **Files between 50-90% line coverage** — moderate gaps
4. **Files below threshold on branches/functions only** — targeted gap-filling

Within each priority tier, prefer:

- API modules and utilities (easiest, highest value)
- Hooks
- Components

### Test conventions — Mobile

- Framework: Jest + `@testing-library/react-native`
- Mocks: `jest.mock()`
- Style mocks: `jest.mock('<path>.styles', () => ({ styles: new Proxy({}, { get: () => ({}) }) }))`
- Components use named exports — always import with `{ Component }`
- Mock Supabase: `jest.mock('@/features/supabase')`
- Mock navigation: `jest.mock('expo-router')`
- Mock TanStack Query hooks by mocking the hook module, not the query client
- Use `renderHook` from `@testing-library/react-native` for hook tests

### Test conventions — Admin

- Framework: Vitest + `@testing-library/react`
- Mocks: `vi.mock()`
- Use `vi.fn()` instead of `jest.fn()`
- Components use named exports
- Mock Next.js navigation: `vi.mock('next/navigation')`

### Test structure

Each test file should follow this pattern:

```typescript
// Mocks first (before imports)
jest.mock(/* ... */);

// Imports
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  // Setup / beforeEach if needed

  it('renders correctly', () => {
    /* ... */
  });

  it('handles user interaction', () => {
    /* ... */
  });

  it('shows loading state', () => {
    /* ... */
  });

  it('handles error state', () => {
    /* ... */
  });
});
```

### Writing targeted tests for coverage gaps

When the coverage report shows specific uncovered lines/branches:

1. Read the source file at the uncovered line ranges
2. Identify the conditions or code paths not exercised
3. Write tests that specifically trigger those paths
4. After writing, re-run coverage on just that file to verify improvement:
   - Mobile: `npx jest <test-file> --forceExit --maxWorkers=2 --coverage --collectCoverageFrom='<source-file>'`
   - Admin: `cd admin && npx vitest run <test-file> --maxWorkers=2 --coverage`

### Rules for writing tests

- Test behavior and contracts, not implementation details
- Each test should have a clear, descriptive name explaining what it verifies
- Keep tests independent — no shared mutable state between tests
- Use `beforeEach` for common setup, not test-to-test dependencies
- Mock external dependencies (API, navigation, storage), not internal logic
- Verify the new test file passes in isolation: `npx jest <test-file-path> --forceExit --maxWorkers=2` (mobile) or `cd admin && npx vitest run <test-file-path> --maxWorkers=2` (admin)

## Phase 4 — Verify

Run quality gates AND coverage for each affected codebase:

**Mobile** (if tests were added/modified):

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit --maxWorkers=2 --coverage --coverageReporters=text-summary
```

**Admin** (if tests were added/modified):

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run --maxWorkers=2 --coverage --coverage.reporter=text-summary
```

Verify:

1. All tests pass
2. Overall coverage numbers improved (or at minimum didn't regress)
3. Files targeted in this cycle now meet thresholds

If any test fails:

1. Read the error output
2. Fix the failing test
3. Re-run to confirm
4. Never skip or disable a test to make it pass

After Phase 4 completes, loop back to Phase 1 for a new full scan.

## Phase 5 — Final Validation

After 3 consecutive clean cycles, run a **full validation pass** to ensure everything compiles, builds, and passes. This is a hard gate — do NOT produce the final report until all checks pass.

### Step 5A — TypeScript compilation (no errors allowed)

```bash
# Mobile
npx tsc --noEmit

# Admin
cd admin && npx tsc --noEmit
```

If there are TypeScript errors, fix them (in test files only — do not modify source unless it's a clear bug introduced by the coverage work) and re-run until clean.

### Step 5B — All tests pass

```bash
# Mobile
npx jest --silent --forceExit --maxWorkers=2

# Admin
cd admin && npx vitest run --maxWorkers=2
```

If any tests fail, fix them and re-run until all pass. Never skip or disable tests to make this step pass.

### Step 5C — ESLint passes

```bash
# Mobile
npx eslint .

# Admin
cd admin && npx eslint . --max-warnings 0
```

Fix any lint errors in test files and re-run until clean.

### Step 5D — Build succeeds

```bash
# Admin (Next.js build)
cd admin && npx next build
```

If the build fails, diagnose and fix the issue. Common causes: import errors in test utilities leaking into the build, missing type exports, or barrel file issues. Fix and re-run until the build succeeds.

**All 4 checks (tsc, tests, lint, build) must pass before producing the final report.** If any check fails, fix the issue and re-run ALL checks from the top (5A through 5D) to ensure no regressions.

## Final Report

After Phase 5 passes completely, print:

```
## Test Coverage — Complete

### Coverage Summary
| Codebase | Statements | Branches | Functions | Lines | Delta |
|----------|-----------|----------|-----------|-------|-------|
| Mobile   | XX.XX%    | XX.XX%   | XX.XX%    | XX.XX%| +X.XX%|
| Admin    | XX.XX%    | XX.XX%   | XX.XX%    | XX.XX%| +X.XX%|

### Stats
- Total cycles: N
- Total test files written: X
- Total tests added to existing files: Y
- Consecutive clean cycles: 3/3

### New Test Files Created
- path/to/test.test.tsx — tests for ComponentName (N tests)

### Existing Tests Improved
- path/to/test.test.tsx — added M tests for [missing coverage areas]

### Final Validation (Phase 5)
| Check        | Mobile | Admin |
|--------------|--------|-------|
| TypeScript   | PASS   | PASS  |
| Tests        | PASS (X suites, Y tests) | PASS (X suites, Y tests) |
| ESLint       | PASS   | PASS  |
| Build        | N/A    | PASS  |
```

## Phase 3B — Coverage Ignore Comments for Unreachable Branches

After writing all possible tests, some branches remain genuinely unreachable in the test environment. Add coverage ignore comments to these — this is the ONLY acceptable source file modification besides bug fixes.

### When to use ignore comments

Only for branches that are **genuinely impossible to test**, not just hard to test:

| Category                         | Example                              | Ignore?                                      |
| -------------------------------- | ------------------------------------ | -------------------------------------------- |
| `Platform.OS === 'android'`      | KeyboardAvoidingView behavior        | **NO** — test with `Platform.OS = 'android'` |
| `Platform.OS` at module scope    | LayoutAnimation enablement           | **NO** — test with `jest.isolateModules()`   |
| Reanimated `useAnimatedStyle`    | Worklet callback                     | **YES** — cannot execute in Jest             |
| `??` inside `enabled: !!x` query | `userId ?? ''` when enabled is false | **YES** — queryFn never runs                 |
| `?.` on always-defined value     | `data?.id` after null check          | **YES** — defensive guard                    |
| `??` where LHS always truthy     | `arr.pop() ?? 'default'`             | **YES** — pop() never returns undefined      |
| Context throw guard              | `if (!ctx) throw` with default value | **YES** — context always has default         |
| Phantom `else` in V8             | `if` without `else` block            | **YES** — V8/Istanbul artifact               |

### Mobile (Jest/Istanbul) — `/* istanbul ignore next */`

**Critical: placement must be INLINE with the branch operator, not on a separate line.**

```typescript
// ✅ CORRECT — inline with ??
const x = value ?? /* istanbul ignore next */ fallback;

// ✅ CORRECT — inline ternary false branch
const x = condition ? trueVal : /* istanbul ignore next */ falseVal;

// ✅ CORRECT — inline with && in JSX
{condition && /* istanbul ignore next */ <Component />}

// ✅ CORRECT — before a whole function (ignores the function body)
/* istanbul ignore next */
const style = useAnimatedStyle(() => { ... });

// ✅ CORRECT — implicit else branch (when the `if` is always true)
/* istanbul ignore else */
if (condition) { ... }

// ✅ CORRECT — guard clause with early return
if /* istanbul ignore next */ (!item) return;

// ❌ WRONG — separate line before ?? (doesn't cover the ?? branch)
/* istanbul ignore next */
const x = value ?? fallback;

// ❌ WRONG — JSX comment syntax (Istanbul can't read it)
{/* istanbul ignore next */}
{condition && <Component />}
```

### Admin (Vitest/V8) — `/* v8 ignore start/stop */`

**V8 coverage ignores are line-based, not AST-based.** `/* v8 ignore next */` does NOT reliably work with TypeScript compilation + source maps. Use start/stop ranges instead.

**IMPORTANT: Do NOT use `@vitest/coverage-istanbul` — it has a known aggregation bug where ignore comments work per-file but get stripped during full-suite coverage merging. Always use the default V8 provider.**

```typescript
// ✅ CORRECT — start/stop range covering the FULL block body
/* v8 ignore start -- reason */
if (condition) {
  doSomething();  // ← must be INSIDE the range, not just the `if`
}
/* v8 ignore stop */

// ✅ CORRECT — in JSX (.tsx files, use JSX comment syntax for start/stop)
{/* v8 ignore start -- reason */}
{condition && <Component />}
{/* v8 ignore stop */}

// ✅ CORRECT — inline expressions
/* v8 ignore start */
const x = value ?? fallback;
/* v8 ignore stop */

// ❌ WRONG — only wrapping the condition, not the body (S/F/L still uncovered)
/* v8 ignore start */
if (condition) {
/* v8 ignore stop */
  doSomething();  // ← this line is NOT ignored!
}

// ❌ WRONG — bare JS comment inside JSX content (renders as literal text!)
<button>
  /* v8 ignore start */    ← appears as visible text in the DOM
  {uploading ? 'Uploading...' : 'Photo'}
  /* v8 ignore stop */
</button>

// ❌ WRONG — v8 ignore next (unreliable with TS compilation)
/* v8 ignore next */
const x = value ?? fallback;
```

### Phantom `else` branches (V8-specific)

V8 creates phantom branch entries for `if` statements without explicit `else` blocks. Two fixes:

**Option 1 — Wrap the entire `if` block with v8 ignore (preferred):**

```typescript
/* v8 ignore start */
if (condition) {
  doSomething();
}
/* v8 ignore stop */
```

**Option 2 — Add explicit empty `else` (when option 1 doesn't work):**

```typescript
if (condition) {
  doSomething();
} /* v8 ignore start */ else {
  /* noop */
} /* v8 ignore stop */
```

### Testing Platform.OS branches (ALWAYS test, never ignore)

```typescript
// For module-scope code (LayoutAnimation):
describe('Android platform', () => {
  it('enables LayoutAnimation on Android', () => {
    jest.resetModules();
    const { Platform, UIManager } = require('react-native');
    Platform.OS = 'android';
    UIManager.setLayoutAnimationEnabledExperimental = jest.fn();
    jest.isolateModules(() => {
      require('../SourceFile');
    });
    expect(UIManager.setLayoutAnimationEnabledExperimental).toHaveBeenCalledWith(true);
    Platform.OS = 'ios';
  });
});

// For in-function code (KeyboardAvoidingView, etc.):
it('uses undefined behavior on Android', () => {
  Platform.OS = 'android';
  const { getByTestId } = render(<Component />);
  // assert android-specific behavior
  Platform.OS = 'ios'; // restore
});
```

### Coverage config exclusions

Ensure coverage collection excludes files that are exempt from testing. Files that appear in coverage reports at 0% drag down the totals.

**Mobile (`jest.config.js` → `collectCoverageFrom`):**

```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  'app/**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!src/types/**',
  '!**/index.ts',
  '!**/*.styles.ts',          // style files — no logic
  '!src/theme/colors.ts',     // constants file — no logic
  '!src/components/profile/settingsTypes.ts', // type-only
],
```

**Admin (`vitest.config.ts` → `test.coverage.exclude`):**

```typescript
coverage: {
  provider: 'v8',  // NEVER use 'istanbul' — aggregation bug
  exclude: [
    'src/__tests__/**',         // test utilities
    'src/app/globals.css',      // CSS file
    'src/lib/variant-config.ts', // config constants
  ],
},
```

### Per-file coverage technique

When fixing stubborn branches, run coverage on a SINGLE test file to see exact uncovered lines — much faster than a full suite run:

**Mobile:**

```bash
npx jest <test-file> --forceExit --maxWorkers=2 --coverage --collectCoverageFrom='<source-file>'
```

**Admin:**

```bash
cd admin && npx vitest run <test-file> --maxWorkers=2 --coverage --coverage.include='<source-file>'
```

This shows the "Uncovered Line #s" column which tells you exactly which lines to target.

## Rules

- **Never modify source code** — only create or edit test files, EXCEPT for adding coverage ignore comments (`/* istanbul ignore next */` or `/* v8 ignore start/stop */`) to genuinely unreachable branches. If a test cannot be written because of a bug in the source code, report the bug in the cycle report but do NOT fix it. The only exception is if the source code has a clear, unambiguous bug that prevents tests from being written — in that case, report the bug, fix it minimally, and note it in the report.
- **No user confirmation needed** — scan, write, verify, loop automatically
- **No commits** — all changes must remain uncommitted. The user will review and commit manually.
- Never skip exempt files (styles, types, configs, barrels, migrations)
- Always verify tests pass before reporting them as done
- Use the correct test framework per codebase (Jest for mobile, Vitest for admin)
- Follow existing mock patterns found in nearby test files
- Respect the 300-line file limit — test files are exempt but keep them reasonable
- Do not add `@ts-ignore` or `any` casts to make tests compile — fix the types
- Do not test private/internal functions — only exported APIs
- Jest uses `--forceExit` (TanStack Query timer leaks)
- Admin ESLint uses `--max-warnings 0`
- **Code-intel annotations** — add `@contract`, `@assumes`, etc. annotations to any source code fixes per CLAUDE.md rules (test files themselves don't need annotations)
- **Coverage data is the source of truth** — prefer coverage report data over manual code inspection when determining what needs testing
- **Clean up coverage artifacts** — delete `coverage/` directories after the final report
