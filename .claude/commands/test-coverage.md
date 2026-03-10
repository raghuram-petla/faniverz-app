# Test Coverage

Systematically find source files missing tests and files with incomplete test coverage, then write the missing tests to reach 100% coverage across mobile (`app/`, `src/`) and admin (`admin/src/`).

## Phase 1 — Scan for Missing Test Files

Find all source files that should have a corresponding test file but don't. Do NOT modify any files during this phase.

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

## Phase 2 — Scan for Incomplete Tests

For each source file that DOES have a test file, analyze coverage completeness:

### What to check in components

- [ ] Renders without crashing (basic render test)
- [ ] All conditional rendering branches tested (if/ternary in JSX)
- [ ] User interactions tested (onPress, onChangeText, onSubmit, etc.)
- [ ] Callback props invoked with correct arguments
- [ ] Loading/error/empty states tested
- [ ] Accessibility labels verified where present

### What to check in hooks

- [ ] Initial return values verified
- [ ] All state transitions triggered and verified
- [ ] Side effects tested (API calls, navigation, etc.)
- [ ] Error/edge states tested
- [ ] Cleanup behavior verified (if applicable)

### What to check in utilities/helpers

- [ ] All exported functions tested
- [ ] Edge cases covered (empty input, null, boundary values)
- [ ] All code branches exercised (if/else, switch, ternary)
- [ ] Error handling paths tested

### What to check in API modules

- [ ] Each exported function has at least one test
- [ ] Success responses handled
- [ ] Error responses handled
- [ ] Request parameters validated

### Scoring

For each file with existing tests, assign a coverage grade:

- **Full**: All checks applicable to the file type are covered
- **Partial**: Some key behaviors or branches are untested
- **Minimal**: Only basic render/smoke test exists, no interaction or branch tests

## Phase 3 — Report

Present findings as markdown tables:

```
## Test Coverage Report

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

## Phase 4 — Write Tests

**Wait for explicit user confirmation before proceeding.** Ask which files to prioritize (missing tests first, then incomplete tests).

### Writing order

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
- Verify the new test file passes in isolation: `npx jest <test-file-path> --forceExit`

## Phase 5 — Verify

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

## Phase 6 — Final Report

```
## Test Coverage Improvement — Summary

**Tests written**: X new test files, Y tests added to existing files
**Coverage before**: A / B files (C%)
**Coverage after**: D / E files (F%)

### New Test Files Created
- path/to/test.test.tsx — tests for ComponentName (N tests)

### Existing Tests Improved
- path/to/test.test.tsx — added M tests for [missing coverage areas]

### Quality gates: Mobile pass/fail | Admin pass/fail
```

## Rules

- Never skip exempt files (styles, types, configs, barrels, migrations)
- Always verify tests pass before reporting them as done
- Use the correct test framework per codebase (Jest for mobile, Vitest for admin)
- Follow existing mock patterns found in nearby test files
- Respect the 300-line file limit — test files are exempt but keep them reasonable
- Do not add `@ts-ignore` or `any` casts to make tests compile — fix the types
- Do not test private/internal functions — only exported APIs
- Jest uses `--forceExit` (TanStack Query timer leaks)
- Admin ESLint uses `--max-warnings 0`
