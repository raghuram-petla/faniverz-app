# Consistency Check

Find functional patterns duplicated across the codebase that should be a single source of truth, then refactor them into centralized components/hooks/utilities.

This is different from `/deduplicate` (code-level duplication) — this skill targets **behavioral/UX pattern duplication** where the same user-facing behavior is re-implemented in multiple places instead of being centralized into one reusable abstraction.

## Phase 1 — Scan

Search both mobile (`app/`, `src/`) and admin (`admin/src/`) codebases for each category below. For each finding, record: **file paths**, **line numbers**, **the duplicated pattern**, and **count of instances**. Do NOT modify any files during this phase.

### Category 1: UI Behavior Patterns

Find UI behaviors implemented inline in 3+ places that should be a single component:

- **Navigation helpers**: Back buttons, home buttons, close buttons with identical logic but inline JSX
- **Loading states**: Centered spinners, skeleton screens, or loading placeholders repeated across screens
- **Safe area handling**: Identical safe area insets + padding patterns across screens
- **Guest/auth gates**: "Login required" or "Guest mode" checks repeated in multiple screens
- **Error states**: Identical error display UI repeated inline
- **Refresh patterns**: Pull-to-refresh setup boilerplate repeated across screens
- **Modal wrappers**: Identical overlay + backdrop + container structure

**Approach**: Grep for common indicators (`ActivityIndicator`, `useSafeAreaInsets`, `isGuest`, `refreshing`, `<Modal`), then read surrounding context to confirm identical patterns across files.

### Category 2: Data Display Patterns

Find data rendering patterns duplicated across 3+ components:

- **Rating displays**: Star icon + rating number rendered inline in multiple card types
- **Date/time formatting**: Inline `toLocaleDateString()` or `new Date().getFullYear()` calls instead of centralized formatters
- **Status indicators**: Badges, pills, or labels with hardcoded color/label mappings
- **Platform rendering**: Platform logos, badges, or links with repeated styling
- **Genre/tag rendering**: Genre pills or tag lists with identical slice + map patterns
- **Avatar rendering**: User/actor avatars with identical fallback logic

**Approach**: Grep for the display element (`Ionicons name="star"`, `toLocaleDateString`, `genres.slice`, `avatar`), then compare implementations across files.

### Category 3: Form & Input Patterns (Admin)

Find form patterns duplicated across admin pages:

- **Form fields**: Label + input/select/textarea with identical Tailwind classes
- **Button variants**: Primary, secondary, danger buttons with identical class strings
- **Search inputs**: Search icon + input + loading indicator repeated
- **Pagination controls**: Load More / Next / Previous buttons with identical logic
- **Card/section wrappers**: Identical container div with same border/padding classes

**Approach**: Grep for Tailwind class patterns (`bg-red-600`, `bg-input`, `bg-surface-card`, `rounded-xl`), then compare full element structures.

### Category 4: Hook Boilerplate

Find hook setup patterns repeated across 3+ screens:

- **Combined hook chains**: Same sequence of hook calls (e.g., `useRefresh` + `usePullToRefresh` always called together)
- **Navigation state reading**: Same `useNavigation().getState()` pattern in multiple files
- **Auth + data gating**: Same `useAuth()` + conditional rendering pattern

**Approach**: Look for groups of hook calls that always appear together in the same order across multiple files.

### Category 5: Regression Tests

Check if existing centralized patterns have regression tests (like `homeButtonConsistency.test.ts`) that enforce consistent usage:

- List all components/hooks meant to be "always used" across screens
- Check if any have an automated scan ensuring they're not bypassed
- Flag centralized patterns that lack regression protection

## Phase 2 — Report

Present findings as a prioritized table:

```
## Consistency Report

### High Priority (3+ files, clear single-source-of-truth abstraction possible)
| Pattern | Files Affected | Current Lines per Instance | Proposed Abstraction |
|---------|---------------|--------------------------|---------------------|

### Medium Priority (2-3 files or pattern has some variation)
| Pattern | Files Affected | Notes |
|---------|---------------|-------|

### Already Centralized (No action needed)
| Pattern | Component/Hook | Usage Count |
|---------|---------------|-------------|

### Missing Regression Tests
| Centralized Pattern | Used In | Has Regression Test? |
|--------------------|---------|--------------------|
```

**Wait for user confirmation before proceeding to Phase 3.** Ask which patterns to consolidate.

## Phase 3 — Consolidate

For each approved pattern, follow this exact workflow:

### 3.1 Create the Abstraction

1. Create the new component/hook/utility in the appropriate directory:
   - Mobile shared components: `src/components/common/` or `src/components/ui/`
   - Mobile hooks: `src/hooks/`
   - Mobile utilities: `src/utils/`
   - Admin components: `admin/src/components/common/`
   - Admin hooks: `admin/src/hooks/`
   - Admin utilities: `admin/src/lib/`

2. Requirements:
   - Export a typed props interface (components) or typed return value (hooks)
   - Accept customization props for legitimate variations (style, color, size)
   - Return `null` or handle "hidden" states internally when conditional
   - Match existing project patterns (named exports, Ionicons, theme usage)

### 3.2 Write Tests for the Abstraction

Before refactoring any consumers:

- Mobile: Jest + `@testing-library/react-native`, `jest.mock()`
- Admin: Vitest + `@testing-library/react`, `vi.mock()`

### 3.3 Refactor Consumers

For each file using the duplicated pattern:

1. Import the new abstraction
2. Replace the inline implementation
3. Remove unused imports (e.g., `useNavigation` if the abstraction handles it internally)
4. Run the file's test suite to verify
5. Move to the next file

### 3.4 Create Regression Test

For patterns that must be used consistently across all screens (like HomeButton), create a test in `__tests__/` that:

- Scans all route files under `app/`
- Verifies each non-exempt screen imports the required component/hook
- Uses an explicit exemption list for screens that don't need it (tab roots, layouts, auth entry points)
- Follows the pattern established in `__tests__/homeButtonConsistency.test.ts`

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

Also verify:

- All files under 300 lines
- Every new file has a corresponding test file
- All existing tests still pass

## Phase 5 — Final Report

```
## Consistency Refactor Summary

### New Abstractions Created
| File | Type | Replaces | Instances Consolidated | Regression Test |
|------|------|----------|----------------------|-----------------|

### Files Modified
| File | Change Description |
|------|-------------------|

### Quality Gates
- Mobile: PASS/FAIL (X tests, Y suites)
- Admin: PASS/FAIL (X tests, Y suites)
- 300-line limit: PASS/FAIL
```

## Rules

- **Single responsibility**: Each abstraction solves ONE pattern. Don't create a "kitchen sink" component.
- **Customization via props, not forks**: If instances vary (e.g., icon color, size), add props — don't create separate components.
- **Internal logic, external styling**: Abstractions own their logic (when to show, what to do on press) but accept style overrides for visual customization.
- **Auto-detect over manual props**: Prefer components that read context internally (e.g., navigation state) over requiring callers to pass computed values.
- **Regression tests for screen-level patterns**: Any pattern expected across all screens MUST have an automated consistency test.
- Never move route files (`app/` or `admin/src/app/`) — extract components out instead.
- Every extracted component must export a typed props interface.
- Respect the 300-line file limit for all files.
- Mobile mocks use `jest.mock()`, admin mocks use `vi.mock()`.
- Admin ESLint uses `--max-warnings 0`.
- Jest uses `--forceExit`.
