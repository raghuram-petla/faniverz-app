# Deduplicate & Improve Architecture

Systematically find and eliminate duplicate code and repeated behavioral patterns across the codebase, then consolidate shared logic into reusable abstractions. Covers both code-level duplication (identical logic copy-pasted) and UX-pattern duplication (same user-facing behavior re-implemented instead of centralized). Scans mobile (`app/`, `src/`), admin (`admin/src/`), and shared (`shared/`) directories.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-fix-verify cycle, immediately start a new scan from Phase 1. Keep looping until **3 consecutive runs find zero duplication issues worth fixing**. Track the run counter:

```
Run 1 → found 8 patterns → fix → Run 2 → found 3 patterns → fix → Run 3 → found 0 → Run 4 → found 0 → Run 5 → found 0 → DONE (3 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–4 cycle (scan, report, fix all, verify)
- A "clean run" means Phase 1 found exactly 0 duplication patterns worth consolidating across all 7 categories
- The 3-clean-run counter resets to 0 if any fixable duplication is found
- Between runs, print: `### Run N complete — {X patterns fixed | clean} (consecutive clean: M/3)`
- After 3 consecutive clean runs, print: `### Deduplicate complete — 3 consecutive clean runs achieved`

**CRITICAL — No shortcuts allowed:**

- **Every single run MUST perform a full scan.** You MUST actually read source files in every iteration — no skipping, no "the code hasn't changed so it's clean", no assuming previous runs were thorough enough.
- **Launch parallel Explore or general-purpose Agents** for each scan to ensure independent, thorough review. Do not rely on memory of previous runs.
- **Never declare a run "clean" without reading the actual code.** If you cannot prove you read the files in that run, it doesn't count.
- A clean run requires actively scanning and finding nothing — not passively assuming nothing changed.

## Phase 1 — Scan for Duplication

Work through each category below using **parallel agents** (at least 3, covering different directories/categories). For every finding, record: **file paths**, **line ranges**, **pattern description**, and **estimated lines duplicated**. Do NOT modify any files during this phase.

### Category 1: Hook Boilerplate Duplication

Search all custom hooks in `src/hooks/`, `src/features/*/` and `admin/src/hooks/` for repeated patterns:

- **CRUD patterns**: Hooks that follow `useQuery`/`useInfiniteQuery` + `useMutation` for create/update/delete against the same Supabase client. Compare the structure of each hook — if 3+ hooks share the same query/mutation skeleton (differing only by table name, key, and column order), flag them as factory candidates.
- **State + fetch patterns**: Hooks that repeat the same `useState` + `try/catch` + `fetch` + state reset logic (e.g., upload handlers, form submission handlers).
- **Combined hook chains**: Same sequence of hook calls (e.g., `useRefresh` + `usePullToRefresh` always called together) repeated across 3+ screens — candidates for a single combined hook.
- **Navigation state reading**: Same `useNavigation().getState()` pattern in multiple files.
- **Auth + data gating**: Same `useAuth()` + conditional rendering pattern repeated across screens.

### Category 2: Inline Logic Duplication

Search for repeated inline logic across components and pages:

- **Upload handlers**: Find all `fetch()` calls to `/api/upload/*` endpoints. Check if multiple files implement the same FormData construction, size validation, error handling, and loading state management.
- **Form validation**: Find repeated validation logic (required fields, format checks, size limits) that appears in multiple forms.
- **Error handling**: Find repeated `try/catch` blocks with identical alert/toast/error-state patterns.
- **Supabase queries**: Find raw `.from(table).select().order()` chains that appear in multiple files outside of hooks.

### Category 3: Config & Constants Duplication

Find configuration values or constant arrays maintained in multiple places:

- **DB-vs-code duplication** (HIGHEST PRIORITY): Hardcoded arrays/maps that duplicate data already stored in a Supabase reference table. The DB table is the single source of truth — code should fetch from it at runtime, not maintain a parallel copy. Cross-reference every exported constant array against the schema (`supabase/migrations/`) to check if a matching table exists. Known DB reference tables: `languages`, `platforms`, `countries`, `admin_roles`, `production_houses`. If a constant mirrors a DB table, it MUST be replaced with a hook/query that reads from the table.
- **Variant/dimension specs**: Image dimensions, quality settings, or resize configs that appear in both client-side and server-side code.
- **Enum-like arrays**: Genre lists, status options, certification values, or category arrays duplicated across files.
- **API endpoints**: Hardcoded endpoint strings repeated in multiple files instead of being centralized.
- **Validation rules**: Max file sizes, allowed types, or format constraints defined in multiple locations.
- **Cache timing**: Hardcoded `staleTime` / `gcTime` values repeated across hooks.

### Category 4: Component & UI Pattern Duplication

Find components and UI behaviors that implement the same pattern with minor variations:

**Code-level patterns** (identical JSX/logic):

- Form field groups, list item layouts, modal/dialog patterns

**UX behavior patterns** (same user-facing behavior, possibly different code):

- Navigation helpers, loading states, safe area handling, guest/auth gates, error states, refresh patterns

**Data display patterns** (same rendering logic):

- Rating displays, date/time formatting, status indicators, platform rendering, genre/tag rendering, avatar rendering

**Admin form patterns**:

- Form fields, button variants, search inputs, pagination controls, card/section wrappers
- **Edit page boilerplate**: Form state setup, save/discard logic, dirty tracking repeated across edit pages

### Category 5: API Route Duplication

Search `admin/src/app/api/` for route handlers that share the same:

- Auth/session checking boilerplate
- Request validation logic
- Response formatting patterns
- Error response construction

### Category 6: Test Utility Duplication

Search `__tests__/` directories for:

- Repeated mock setup blocks (same `vi.mock()` or `jest.mock()` calls across test files)
- Repeated test helper functions (render wrappers, data factories, assertion helpers)
- Repeated mock data objects that are identical or near-identical

### Category 7: Regression Test Coverage

Check if existing centralized patterns have regression tests:

- List all components/hooks meant to be "always used" across screens
- Check if any have an automated scan ensuring they're not bypassed
- Flag centralized patterns that lack regression protection

### Filtering Rules

Only flag patterns as duplication if:

- **High**: 50+ lines duplicated across 3+ files, clear abstraction possible
- **Medium**: 20-50 lines duplicated, or only 2 files involved
- **Low**: <20 lines or pattern is too varied for clean abstraction

Skip patterns that are:

- Already centralized into shared components/hooks/utilities
- Too varied for clean abstraction (>30% custom logic per instance)
- Standard framework usage (e.g., `useRouter()`, `useSafeAreaInsets()` calls)

## Phase 2 — Report

Present findings as markdown tables grouped by category. Include:

- Total estimated lines of duplication
- Recommended consolidation order (highest-impact first)
- Proposed abstractions (factory function, shared hook, utility, component, config file)

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL patterns across all priority levels, starting with High priority.

## Phase 3 — Consolidate & Fix

Apply consolidations in safest-first order:

### 3.1 Config & Constants (Category 3)

- **DB-mirrored constants**: Delete the hardcoded constant entirely. Create a hook (e.g., `useXxxOptions()`) that fetches from the DB table via existing context/query. Update all consumers to use the hook. The constant must NOT exist in code — only in the DB.
- **Code-only constants**: Create or update shared config files. Replace all duplicated definitions with imports from the single source.

### 3.2 Utility Functions (Category 2 — non-hook logic)

- Extract repeated logic into utility functions in `src/utils/` or `admin/src/lib/`
- Keep utilities pure where possible
- Replace inline implementations with utility calls

### 3.3 Shared Hooks (Categories 1 & 2 — stateful logic)

- For CRUD patterns: Create factory functions that generate hooks from config. Preserve all existing export names (zero breaking changes).
- For repeated state patterns: Create shared hooks that encapsulate the repeated logic.

### 3.4 Shared Components (Category 4)

- Mobile shared: `src/components/common/` or `src/components/ui/`
- Admin shared: `admin/src/components/common/`
- Requirements: typed props interface, customization via props, named exports

### 3.5 API Route Helpers (Category 5)

- Extract shared middleware-like functions (auth checks, error formatting)
- Create response helpers for consistent error/success responses

### 3.6 Test Utilities (Category 6)

- Create shared test helpers in `__tests__/helpers/` or `admin/src/__tests__/helpers/`
- Move repeated mocks into shared mock setup files

### 3.7 Regression Tests (Category 7)

- For patterns that must be used consistently across all screens, create consistency tests
- Follow the pattern established in `__tests__/homeButtonConsistency.test.ts`

### Implementation rules for each consolidation:

1. Create the new shared abstraction with tests
2. Refactor ONE consumer to use the new abstraction
3. Run quality gates to verify
4. Refactor remaining consumers
5. Verify all existing tests still pass

### Write Tests

For every new file created during consolidation:

- **Utility functions**: Test all branches, edge cases, error handling
- **Factory functions**: Test each generated hook type
- **Shared hooks**: Test state transitions, success/error paths, loading states
- **Shared components**: Test rendering, props, interactions
- **API helpers**: Test auth checks, error formatting

Follow project test conventions:

- Mobile: Jest + `@testing-library/react-native`, `jest.mock()`
- Admin: Vitest + `@testing-library/react`, `vi.mock()`

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
2. Fix the issue (do not revert the consolidation unless unfixable)
3. Re-run quality gates to confirm
4. If unfixable, revert the specific consolidation and note it as infeasible

Also verify:

- All files under 300 lines
- Every new file has a corresponding test file
- All existing tests still pass

Then loop back to Phase 1 with a new scan.

## Final Report

After 3 consecutive clean runs, print:

```
## Deduplication Summary

**Before**: ~X lines of duplicated code across Y files
**After**: ~Z lines removed, consolidated into N shared abstractions

### New Abstractions Created
| File | Type | Purpose | Lines | Test File |
|------|------|---------|-------|-----------|

### Files Modified
| File | Before (lines) | After (lines) | Change |
|------|----------------|---------------|--------|

### Consolidations Skipped
| Pattern | Reason |
|---------|--------|

### Quality Gates
- Mobile: PASS/FAIL (X tests, Y suites)
- Admin: PASS/FAIL (X tests, Y suites)
- 300-line limit: PASS/FAIL

### Stats
- Total runs: N
- Total patterns found and fixed: M
```

## Rules

- **Zero breaking changes**: All existing export names, function signatures, and component APIs must be preserved. Consumers should work without modification after import paths are updated.
- **Preserve all existing tests**: Every test that passed before must pass after. New abstractions get new tests; existing tests are updated only to fix import paths.
- **One consumer at a time**: When refactoring consumers to use a new abstraction, modify and verify one file at a time.
- **Single responsibility**: Each abstraction solves ONE pattern. Don't create a "kitchen sink" component.
- **Customization via props, not forks**: If instances vary (e.g., icon color, size), add props — don't create separate components.
- **Internal logic, external styling**: Abstractions own their logic but accept style overrides for visual customization.
- **Auto-detect over manual props**: Prefer components that read context internally over requiring callers to pass computed values.
- **Regression tests for screen-level patterns**: Any pattern expected across all screens MUST have an automated consistency test.
- Never remove exports from route/page files — framework entry points.
- Never move route files (`app/` or `admin/src/app/`) — extract components out instead.
- Never modify migration files (`supabase/`).
- Every extracted component must export a typed props interface.
- Respect the 300-line file limit for all new files.
- If a hook/component is too custom to fit a factory/shared pattern (>30% custom logic), skip it — note as "too custom" in the report.
- When creating factory patterns, use TypeScript generics for type safety.
- Prefer composition over inheritance.
- Keep abstractions minimal — solve for the current duplication, not hypothetical future needs.
- Mobile mocks use `jest.mock()`, admin mocks use `vi.mock()`.
- Admin ESLint uses `--max-warnings 0`.
- Jest uses `--forceExit`.
- **Do NOT commit** — leave all changes uncommitted for the user to review.
- **Code-intel annotations** — add `@contract`, `@assumes`, etc. annotations to new/changed code per CLAUDE.md rules.
