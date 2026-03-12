# Deduplicate & Improve Architecture

Systematically find and eliminate duplicate code and repeated behavioral patterns across the codebase, then consolidate shared logic into reusable abstractions. Covers both code-level duplication (identical logic copy-pasted) and UX-pattern duplication (same user-facing behavior re-implemented instead of centralized). Scans mobile (`app/`, `src/`), admin (`admin/src/`), and shared (`shared/`) directories.

## Phase 1 — Scan for Duplication

Work through each category below. For every finding, record: **file paths**, **line ranges**, **pattern description**, and **estimated lines duplicated**. Do NOT modify any files during this phase.

### Category 1: Hook Boilerplate Duplication

Search all custom hooks in `src/hooks/` and `admin/src/hooks/` for repeated patterns:

- **CRUD patterns**: Hooks that follow `useQuery`/`useInfiniteQuery` + `useMutation` for create/update/delete against the same Supabase client. Compare the structure of each hook — if 3+ hooks share the same query/mutation skeleton (differing only by table name, key, and column order), flag them as factory candidates.
- **State + fetch patterns**: Hooks that repeat the same `useState` + `try/catch` + `fetch` + state reset logic (e.g., upload handlers, form submission handlers).
- **Combined hook chains**: Same sequence of hook calls (e.g., `useRefresh` + `usePullToRefresh` always called together) repeated across 3+ screens — candidates for a single combined hook.
- **Navigation state reading**: Same `useNavigation().getState()` pattern in multiple files.
- **Auth + data gating**: Same `useAuth()` + conditional rendering pattern repeated across screens.

**For each finding, record**:

- Which hooks/files share the pattern
- What varies between them (table, key, endpoint, etc.)
- Estimated lines that could be consolidated

### Category 2: Inline Logic Duplication

Search for repeated inline logic across components and pages:

- **Upload handlers**: Find all `fetch()` calls to `/api/upload/*` endpoints. Check if multiple files implement the same FormData construction, size validation, error handling, and loading state management.
- **Form validation**: Find repeated validation logic (required fields, format checks, size limits) that appears in multiple forms.
- **Error handling**: Find repeated `try/catch` blocks with identical alert/toast/error-state patterns.
- **Supabase queries**: Find raw `.from(table).select().order()` chains that appear in multiple files outside of hooks.

**Approach**: For each pattern, grep for the key function call (e.g., `new FormData`, `.from(`, `fetch('/api/upload`), then read surrounding context to confirm duplication.

### Category 3: Config & Constants Duplication

Find configuration values or constant arrays maintained in multiple places:

- **Variant/dimension specs**: Image dimensions, quality settings, or resize configs that appear in both client-side and server-side code.
- **Enum-like arrays**: Genre lists, status options, certification values, or category arrays duplicated across files.
- **API endpoints**: Hardcoded endpoint strings repeated in multiple files instead of being centralized.
- **Validation rules**: Max file sizes, allowed types, or format constraints defined in multiple locations.

**Approach**: Search for numeric literals, string arrays, and object literals that appear identical or near-identical in 2+ files.

### Category 4: Component & UI Pattern Duplication

Find components and UI behaviors that implement the same pattern with minor variations. This covers both structural code duplication and behavioral/UX patterns re-implemented inline instead of centralized.

**Code-level patterns** (identical JSX/logic):

- **Form field groups**: Identical input + label + error message patterns repeated across forms.
- **List item layouts**: Similar card/row components that could be parameterized.
- **Modal/dialog patterns**: Repeated modal structures with the same open/close/confirm logic.

**UX behavior patterns** (same user-facing behavior, possibly different code):

- **Navigation helpers**: Back buttons, home buttons, close buttons with identical logic but inline JSX.
- **Loading states**: Centered spinners, skeleton screens, or loading placeholders repeated across screens.
- **Safe area handling**: Identical safe area insets + padding patterns across screens.
- **Guest/auth gates**: "Login required" or "Guest mode" checks repeated in multiple screens.
- **Error states**: Identical error display UI repeated inline.
- **Refresh patterns**: Pull-to-refresh setup boilerplate repeated across screens.

**Data display patterns** (same rendering logic):

- **Rating displays**: Star icon + rating number rendered inline in multiple card types.
- **Date/time formatting**: Inline `toLocaleDateString()` or `new Date().getFullYear()` calls instead of centralized formatters.
- **Status indicators**: Badges, pills, or labels with hardcoded color/label mappings.
- **Platform rendering**: Platform logos, badges, or links with repeated styling.
- **Genre/tag rendering**: Genre pills or tag lists with identical slice + map patterns.
- **Avatar rendering**: User/actor avatars with identical fallback logic.

**Admin form patterns**:

- **Form fields**: Label + input/select/textarea with identical Tailwind classes.
- **Button variants**: Primary, secondary, danger buttons with identical class strings.
- **Search inputs**: Search icon + input + loading indicator repeated.
- **Pagination controls**: Load More / Next / Previous buttons with identical logic.
- **Card/section wrappers**: Identical container div with same border/padding classes.

**Approach**: Grep for common indicators (`ActivityIndicator`, `useSafeAreaInsets`, `isGuest`, `refreshing`, `<Modal`, `Ionicons name="star"`, `toLocaleDateString`, `genres.slice`, `bg-red-600`, `bg-input`, `bg-surface-card`), then compare implementations across files. Flag groups of 3+ components that share >60% structural similarity.

### Category 5: API Route Duplication

Search `admin/src/app/api/` (and `app/api/` if it exists) for route handlers that share the same:

- Auth/session checking boilerplate
- Request validation logic
- Response formatting patterns
- Error response construction
- File upload processing pipelines

**Approach**: Read each route file and extract the common skeleton. If 3+ routes share the same auth check + try/catch + response format, flag the shared portions.

### Category 6: Test Utility Duplication

Search `__tests__/` directories for:

- Repeated mock setup blocks (same `vi.mock()` or `jest.mock()` calls across test files)
- Repeated test helper functions (render wrappers, data factories, assertion helpers)
- Repeated mock data objects that are identical or near-identical

**Note**: This is informational — test duplication is lower priority than source duplication.

### Category 7: Regression Test Coverage

Check if existing centralized patterns have regression tests (like `homeButtonConsistency.test.ts`) that enforce consistent usage:

- List all components/hooks meant to be "always used" across screens
- Check if any have an automated scan ensuring they're not bypassed
- Flag centralized patterns that lack regression protection

## Phase 2 — Report

Present findings as markdown tables grouped by category:

```
## Duplication Report

### Category 1: Hook Boilerplate (X groups, ~Y lines duplicated)
| Pattern | Files Involved | Varying Parameters | Duplicated Lines |
|---------|---------------|-------------------|-----------------|

### Category 2: Inline Logic (X patterns, ~Y lines duplicated)
| Pattern | Files | Description | Duplicated Lines |
|---------|-------|-------------|-----------------|

### Category 3: Config & Constants (X items, ~Y lines duplicated)
| Value/Config | Files | Description | Duplicated Lines |
|-------------|-------|-------------|-----------------|

### Category 4: Component & UI Patterns (X groups, ~Y lines duplicated)
| Pattern | Components | Type (code/UX/data/admin) | Duplicated Lines |
|---------|-----------|--------------------------|-----------------|

### Category 5: API Routes (X patterns, ~Y lines duplicated)
| Pattern | Routes | Description | Duplicated Lines |
|---------|--------|-------------|-----------------|

### Category 6: Test Utilities (X patterns) — informational
| Pattern | Test Files | Description |
|---------|-----------|-------------|

### Already Centralized (No action needed)
| Pattern | Component/Hook | Usage Count |
|---------|---------------|-------------|

### Missing Regression Tests
| Centralized Pattern | Used In | Has Regression Test? |
|--------------------|---------|--------------------|
```

**Priority ratings**:

- **High**: 50+ lines duplicated across 3+ files, clear abstraction possible
- **Medium**: 20-50 lines duplicated, or only 2 files involved
- **Low**: <20 lines or pattern is too varied for clean abstraction

End with:

- Total estimated lines of duplication
- Recommended consolidation order (highest-impact first)
- Proposed abstractions (factory function, shared hook, utility, component, config file)

**Wait for explicit user confirmation before proceeding to Phase 3.** Ask which categories/patterns to consolidate.

## Phase 3 — Consolidate

Apply the approved consolidations in safest-first order:

### 3.1 Config & Constants (Category 3)

- Create or update shared config files (e.g., `src/constants/`, `admin/src/lib/`)
- Replace all duplicated definitions with imports from the single source
- Ensure both client and server code import from the same source

### 3.2 Utility Functions (Category 2 — non-hook logic)

- Extract repeated logic into utility functions in `src/utils/` or `admin/src/lib/`
- Keep utilities pure (no React state, no side effects) where possible
- Replace inline implementations with utility calls

### 3.3 Shared Hooks (Categories 1 & 2 — stateful logic)

- For CRUD hook patterns: Create a factory function that generates hooks from a config object. The factory should accept table name, query keys, sort order, and return typed hooks. Preserve all existing export names (zero breaking changes).
- For upload/fetch patterns: Create a shared hook that encapsulates the repeated state + async + error logic. Export both a hook version (for components) and a standalone async version (for non-hook contexts).

### 3.4 Shared Components (Category 4)

Create the new component/hook/utility in the appropriate directory:

- Mobile shared components: `src/components/common/` or `src/components/ui/`
- Mobile hooks: `src/hooks/`
- Mobile utilities: `src/utils/`
- Admin components: `admin/src/components/common/`
- Admin hooks: `admin/src/hooks/`
- Admin utilities: `admin/src/lib/`

Requirements:

- Export a typed props interface (components) or typed return value (hooks)
- Accept customization props for legitimate variations (style, color, size)
- Return `null` or handle "hidden" states internally when conditional
- Match existing project patterns (named exports, Ionicons, theme usage)

Replace instances with the shared component, passing variation via props.

### 3.5 API Route Helpers (Category 5)

- Extract shared middleware-like functions (auth checks, error formatting)
- Create response helpers for consistent error/success responses
- Replace boilerplate in each route with helper calls

### 3.6 Regression Tests (Category 7)

For patterns that must be used consistently across all screens (like HomeButton), create a test in `__tests__/` that:

- Scans all route files under `app/`
- Verifies each non-exempt screen imports the required component/hook
- Uses an explicit exemption list for screens that don't need it (tab roots, layouts, auth entry points)
- Follows the pattern established in `__tests__/homeButtonConsistency.test.ts`

### 3.7 Test Utilities (Category 6 — if user opts in)

- Create shared test helpers in `__tests__/helpers/` or `__tests__/factories/`
- Move repeated mocks into shared mock setup files

### Implementation rules for each consolidation:

1. Create the new shared abstraction with tests
2. Refactor ONE consumer to use the new abstraction
3. Run quality gates to verify
4. Refactor remaining consumers one at a time
5. Verify all existing tests still pass after each change

## Phase 4 — Write Tests

For every new file created during consolidation:

- **Utility functions**: Test all branches, edge cases, error handling
- **Factory functions**: Test each generated hook type (list, single, create, update, delete)
- **Shared hooks**: Test state transitions, success/error paths, loading states
- **Shared components**: Test rendering, props, interactions, conditional content
- **API helpers**: Test auth checks, error formatting, response construction

Follow project test conventions:

- Mobile: Jest + `@testing-library/react-native`, `jest.mock()`
- Admin: Vitest + `@testing-library/react`, `vi.mock()`

## Phase 5 — Verify

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

## Phase 6 — Final Report

```
## Deduplication Summary

**Before**: ~X lines of duplicated code across Y files
**After**: ~Z lines removed, consolidated into N shared abstractions

### New Abstractions Created
| File | Type | Purpose | Lines | Test File | Regression Test |
|------|------|---------|-------|-----------|-----------------|

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
```

## Rules

- **Zero breaking changes**: All existing export names, function signatures, and component APIs must be preserved. Consumers should work without modification after import paths are updated.
- **Preserve all existing tests**: Every test that passed before must pass after. New abstractions get new tests; existing tests are updated only to fix import paths.
- **One consumer at a time**: When refactoring consumers to use a new abstraction, modify and verify one file at a time.
- **Single responsibility**: Each abstraction solves ONE pattern. Don't create a "kitchen sink" component.
- **Customization via props, not forks**: If instances vary (e.g., icon color, size), add props — don't create separate components.
- **Internal logic, external styling**: Abstractions own their logic (when to show, what to do on press) but accept style overrides for visual customization.
- **Auto-detect over manual props**: Prefer components that read context internally (e.g., navigation state) over requiring callers to pass computed values.
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
