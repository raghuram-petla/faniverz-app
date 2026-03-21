# Test Coverage

Find and fix test coverage gaps in a loop across mobile (`app/`, `src/`) and admin (`admin/src/`). Runs until **3 consecutive cycles find 0 gaps**.

## Loop Mode

Each "cycle" consists of: scan → report → write tests → verify. Keep looping until **3 consecutive cycles find zero coverage gaps**.

```
Cycle 1 → 12 missing tests → write them → Cycle 2 → 3 gaps → fix → Cycle 3 → 0 gaps → Cycle 4 → 0 gaps → Cycle 5 → 0 gaps → DONE
```

**Rules for loop mode:**

- Each cycle is a full Phase 1–4 pass (scan, report, write, verify)
- A "clean cycle" means Phase 1 found exactly 0 missing test files AND 0 incomplete tests
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

## Phase 1 — Scan for Coverage Gaps

Find all source files missing tests AND files with incomplete test coverage. Do NOT modify any files during this phase.

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

### Scan for incomplete tests

For each source file that DOES have a test file, analyze coverage completeness:

**Components:**

- [ ] Renders without crashing (basic render test)
- [ ] All conditional rendering branches tested (if/ternary in JSX)
- [ ] User interactions tested (onPress, onChangeText, onSubmit, etc.)
- [ ] Callback props invoked with correct arguments
- [ ] Loading/error/empty states tested
- [ ] Accessibility labels verified where present

**Hooks:**

- [ ] Initial return values verified
- [ ] All state transitions triggered and verified
- [ ] Side effects tested (API calls, navigation, etc.)
- [ ] Error/edge states tested
- [ ] Cleanup behavior verified (if applicable)

**Utilities/helpers:**

- [ ] All exported functions tested
- [ ] Edge cases covered (empty input, null, boundary values)
- [ ] All code branches exercised (if/else, switch, ternary)
- [ ] Error handling paths tested

**API modules:**

- [ ] Each exported function has at least one test
- [ ] Success responses handled
- [ ] Error responses handled
- [ ] Request parameters validated

**Scoring:**

- **Full**: All checks applicable to the file type are covered
- **Partial**: Some key behaviors or branches are untested
- **Minimal**: Only basic render/smoke test exists, no interaction or branch tests

### Approach

Launch **at least 2 parallel agents** (one for mobile, one for admin) with explicit directory assignments so each area gets independent coverage. Each agent must use Read/Grep/Glob tools to verify findings — not assumptions.

## Phase 2 — Report

Present findings as markdown tables:

```
## Test Coverage Report (Cycle N)

### Missing Test Files (X found)
| Source File | Expected Test Path | File Type |
|-------------|-------------------|-----------|

### Incomplete Tests (X found)
| Source File | Test File | Grade | Missing Coverage |
|-------------|-----------|-------|------------------|

### Summary
- Files with tests: X / Y (Z%)
- Full coverage: A files
- Partial coverage: B files
- Minimal coverage: C files
- No tests: D files
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and write ALL missing tests.

## Phase 3 — Write Tests

Write tests for all gaps found in Phase 1, in this priority order:

1. Missing tests for API modules and utilities (easiest, highest value)
2. Missing tests for hooks
3. Missing tests for components
4. Incomplete tests upgraded to full coverage

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

### Rules for writing tests

- Test behavior and contracts, not implementation details
- Each test should have a clear, descriptive name explaining what it verifies
- Keep tests independent — no shared mutable state between tests
- Use `beforeEach` for common setup, not test-to-test dependencies
- Mock external dependencies (API, navigation, storage), not internal logic
- Verify the new test file passes in isolation: `npx jest <test-file-path> --forceExit` (mobile) or `cd admin && npx vitest run <test-file-path>` (admin)

## Phase 4 — Verify

Run quality gates for each affected codebase:

**Mobile** (if tests were added/modified):

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

**Admin** (if tests were added/modified):

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

If any test fails:

1. Read the error output
2. Fix the failing test
3. Re-run to confirm
4. Never skip or disable a test to make it pass

After Phase 4 completes, loop back to Phase 1 for a new full scan.

## Final Report

After 3 consecutive clean cycles, print:

```
## Test Coverage — Complete

### Stats
- Total cycles: N
- Total test files written: X
- Total tests added to existing files: Y
- Consecutive clean cycles: 3/3

### New Test Files Created
- path/to/test.test.tsx — tests for ComponentName (N tests)

### Existing Tests Improved
- path/to/test.test.tsx — added M tests for [missing coverage areas]

### Quality Gates
- Mobile: PASS/FAIL (X suites, Y tests)
- Admin: PASS/FAIL (X suites, Y tests)
```

## Rules

- **Never modify source code** — only create or edit test files. If a test cannot be written because of a bug in the source code, report the bug in the cycle report but do NOT fix it. The only exception is if the source code has a clear, unambiguous bug that prevents tests from being written — in that case, report the bug, fix it minimally, and note it in the report.
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
