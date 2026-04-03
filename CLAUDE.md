# Faniverz Codebase Rules

## Worktree-First Workflow

**All feature work must happen in an isolated git worktree.** This keeps the main working directory clean and prevents uncommitted changes from colliding across sessions.

### How to create worktrees

Use `isolation: "worktree"` when launching Agents. This automatically creates a worktree branch, runs all work there, and returns the branch name. For direct (non-Agent) work, create manually:

```bash
git worktree add .claude/worktrees/<branch-name> -b <branch-name>
```

### Rules

- Never modify source files in the main working directory — always use a worktree.
- If the user explicitly says to work in the main directory, skip this rule.
- Skills (`/review-and-fix`, `/bug-hunt`, etc.) must also run against the worktree, not the main directory.
- Run quality gates inside the worktree, not the main directory.
- **Shipping**: Use `/ship` to commit in the worktree, merge into master, push, and clean up (remove worktree, delete branch). Do not leave orphaned worktree branches.

## Protected Files — DO NOT MODIFY

The following files contain carefully tuned animation logic with 14+ failed approaches documented. **Do not refactor, deduplicate, reorganize, or "improve" these files** unless the user explicitly asks to change image viewer behavior. This includes skills like `/deduplicate`, `/simplify`, `/refactor-check`, `/dead-code-scan`, and `/test-coverage` — skip these files entirely.

- `src/components/common/ImageViewerOverlay.tsx`
- `src/components/common/ImageViewerOverlay.styles.ts`
- `src/components/common/ImageViewerGestures.tsx`
- `src/components/common/useLoadingProgressBar.ts`
- `src/components/feed/HomeFeedTopChromeMask.tsx`
- `src/components/feed/HomeFeedHeaderChrome.tsx`
- `src/providers/ImageViewerProvider.tsx`

## 300-Line File Limit

**Every source file must stay under 300 lines.** After making any code change (feature, bug fix, refactor), check if the modified files exceed 300 lines. If they do, refactor before considering the task done.

### What counts

- All `.ts` and `.tsx` files under `app/`, `src/`, and `admin/src/`

### What's exempt

- Style files (`.styles.ts`) — pure extracted StyleSheet blocks
- Test files (`__tests__/`, `.test.ts`, `.test.tsx`)
- Config files (`.config.ts`, `.config.js`, `jest.setup.js`)
- Type-only files (`.d.ts`)
- Seed/migration scripts (`scripts/`)
- Auto-generated files (`.next/`)

### How to refactor when a file exceeds 300 lines

**Mobile screens (`app/**/\*.tsx`)\*\*:

1. Extract `StyleSheet.create()` into `<filename>.styles.ts` next to the file
2. If still over 300, extract sub-components into `app/<route>/components/` (for route-specific) or `src/components/<feature>/` (for shared)
3. Components receive styles via import from the `.styles.ts` file, or via props (`styles: Record<string, any>`) when in `src/components/`

**Admin pages (`admin/src/app/**/\*.tsx`)\*\*:

1. Extract form sections into `admin/src/components/<feature>/`
2. Extract complex state + handlers into hooks under `admin/src/hooks/`

**Hooks over 300 lines**: Split into types (`*Types.ts`), handlers (`*Handlers.ts`), derived state (`*Derived.ts`), and main orchestrator

**Critical rules**:

- Never move route files (`app/` or `admin/src/app/`) — extract components out of them instead
- Every extracted component must export a typed props interface
- Every extracted component must have a corresponding test file
- Run quality gates after refactoring (see below)

## Quality Gates

Run these after every change:

- **Mobile**: `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
- **Admin**: `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`

## Test Coverage — Target 100%

**Every source file must have a corresponding test file.** After making any code change, write or update tests for every modified and newly created file before considering the task done.

### What must be tested

- All components (screens, extracted sub-components, shared UI)
- All custom hooks
- All utility/helper functions
- All API modules

### What's exempt from test requirements

- Style files (`.styles.ts`) — no logic to test
- Type-only files (`types.ts`, `.d.ts`) — no runtime behavior
- Config files, seed scripts, barrel exports (`index.ts` re-exports only)

### What to test in each file type

- **Components**: Rendering with default/edge-case props, user interactions (press, type, toggle), conditional rendering, callback invocations with correct arguments, accessibility labels
- **Hooks**: Return values, state transitions, side effects, error states
- **Utilities**: All branches, edge cases, error handling
- **API modules**: Request construction, response transformation, error mapping

### Rules

- Write tests alongside the code, not as a separate follow-up task
- New components without tests are not considered done
- If modifying an existing file that lacks tests, add tests for the changed behavior at minimum
- Aim for meaningful coverage — test behavior and contracts, not implementation details

## Test Conventions

- Mobile tests: Jest + `@testing-library/react-native`, use `jest.mock()`
- Admin tests: Vitest + `@testing-library/react`, use `vi.mock()`
- Mock styles with: `jest.mock('<path>.styles', () => ({ styles: new Proxy({}, { get: () => ({}) }) }))`
- Components use named exports — always import with `{ Component }` not default imports

## Behavioral Rules (Learned from Session History)

These rules were extracted from 60+ sessions and 160+ commits. They address recurring mistakes. **Follow all of them for every task.**

### Before Declaring "Done"

1. **Wire up real functionality, not just UI.** Every button, toggle, and action must have a working handler connected to actual backend/state logic. A Follow button that doesn't call an API is not done. A form that doesn't save is not done.
2. **Apply pending DB migrations** before testing features that depend on new tables/columns. Run `supabase migration up` and verify the schema exists.
3. **Search the ENTIRE codebase** when making a "global" change (renaming text, adding a feature to all screens, updating a pattern). Use `grep -r` to find ALL instances. Missing even one screen is a failure.
4. **Include admin panel in scope.** Unless explicitly told "mobile only," every feature/fix applies to both `app/` + `src/` AND `admin/src/`. Always ask if unsure.
5. **Run quality gates automatically** after every change — don't wait to be asked.
6. **Check file line counts** on every modified file. If any exceed 300 lines, refactor before moving on.
7. **Commit ALL changed files.** Before finishing, run `git status` and ensure no orphaned uncommitted changes are left behind. If changes shouldn't be committed, explicitly say so.
8. **Add code-intel annotations to every modified source file.** Use the structured comment prefixes (`@contract`, `@assumes`, `@nullable`, `@sideeffect`, `@sync`, `@invariant`, `@boundary`, `@coupling`, `@edge`) from the `/code-intel` skill. Annotate new and changed code only — don't annotate the entire file, just the lines you touched or added. See `.claude/commands/code-intel.md` for the full taxonomy and examples.

### During Implementation

9. **Don't make unasked-for changes.** If asked to increase avatar size, change ONLY the avatar size. Don't adjust margins, spacing, colors, or add features that weren't requested. Collateral changes break things.
10. **Don't add features that weren't requested.** No pinned posts, no extra buttons, no "improvements" beyond the ask.
11. **Plan before executing** when the user says "plan" or "let's think about this." Present the plan, wait for confirmation. Never jump ahead to coding.
12. **Handle null/undefined/empty states.** Every image must have a placeholder fallback. Every number must default to 0. Every list must have an empty state. Never show broken images, "undefined", or black screens.
13. **Respect safe area constraints** on every screen. Use `useSafeAreaInsets()` consistently. Test that content doesn't enter the status bar zone.
14. **Support both themes.** Every UI change must look correct in both dark and light themes. Check both before declaring done.
15. **Never hardcode localhost URLs.** Always use environment variables for service endpoints.
16. **Check migration numbering** before creating new migration files. Look at existing files to avoid version conflicts.

17. **Every admin page with a form must use `useUnsavedChangesWarning`.** Import and call `useUnsavedChangesWarning(isDirty)` from `@/hooks/useUnsavedChangesWarning`. For edit pages, compute `isDirty` by comparing current form state to initial values stored in a `useRef` (set when server data loads). For create/new pages, `isDirty` should be true when any field has been filled in. This prevents users from accidentally losing unsaved work when navigating away.

### When Fixing Issues

18. **Don't repeat failed approaches.** If "clear cache and reload" didn't work the first time, dig deeper into root cause (check DB state, check props being passed, check API responses).
19. **Verify fixes end-to-end** before declaring them done. If the fix involves a backend change, verify the frontend actually receives the new data.
20. **When the user says "still not working," investigate differently.** Don't apply the same fix again. Check a different layer (DB vs API vs component vs props chain).

### Visual/UI Changes

21. **Expect 2-3 rounds of UI feedback.** For sizing/spacing changes, make conservative first attempts. Don't overshoot — it's easier to go bigger than to revert.
22. **Ensure consistency across all screens.** If a component looks one way on the spotlight page, it must look the same on the movie detail page, search results, and feed cards.
23. **Keep optimistic state updates in sync with comparison logic.** When any fill/sync/update operation applies fields to the DB, the client-side optimistic update (`applyTmdbFields`) must mirror ALL fields that the gap/status comparison checks (`getStatus`). When adding a new fillable field, update BOTH. Before declaring a sync-related change done, verify every case in `getStatus` has a matching case in `applyTmdbFields`.
