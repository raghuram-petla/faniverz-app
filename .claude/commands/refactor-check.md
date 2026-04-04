# Refactor Check

Audit the codebase for files exceeding 300 lines and enforce decomposition standards.

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `~/faniverz-worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add ~/faniverz-worktrees/refactor-check-$(date +%s) -b refactor-check-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, quality gates, and commits must happen inside the worktree.** Never modify files in the main working directory.

## Steps

1. **Line count audit** — Find all source files over 300 lines (excluding `node_modules`, `__tests__`, `.test.`, `.styles.ts`, `.config.`, `jest.setup`, `.next`, `scripts/`, `.d.ts`):

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

2. **If violations found**, for each file over 300 lines:
   - **Mobile screen files (`app/**/\*.tsx`)**: Extract `StyleSheet.create()`into`<filename>.styles.ts`. If still over 300, extract sub-components into a `components/`directory next to the file (for route files) or into`src/components/<feature>/` (for shared components).

   - **Admin pages (`admin/src/app/**/\*.tsx`)**: Extract form sections, preview panels, or complex JSX blocks into components under `admin/src/components/<feature>/`. Extract complex state + handlers into custom hooks under `admin/src/hooks/`.

   - **Hooks over 300 lines**: Split into focused files — types (`*Types.ts`), handlers (`*Handlers.ts`), derived state (`*Derived.ts`), and a main orchestrator hook.

   - **Component files**: Extract sub-components with typed props interfaces. Each component should have a single responsibility.

3. **After refactoring**, verify:
   - Every extracted component has a test file
   - Mobile quality gate passes: `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
   - Admin quality gate passes: `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`

4. **Report results** — Show a table of files that were over 300 lines, their original count, and their new count after refactoring.

## Rules

- Never move files in `app/` (they are Expo Router / Next.js route files) — extract components out instead
- Style files (`.styles.ts`) and test files are exempt from the 300-line limit
- Seed scripts in `scripts/` are exempt
- Auto-generated files (`.next/`) are exempt
- Extracted components must export typed props interfaces
- Mobile components go to `src/components/<feature>/` or `app/<route>/components/`
- Admin components go to `admin/src/components/<feature>/`
- Mocks in new mobile tests use `jest.mock()`, admin tests use `vi.mock()`
- Admin ESLint uses `--max-warnings 0` (no warnings allowed)
- **Never reduce line count by removing comments, code-intel annotations, or documentation.** Line reduction must come from structural decomposition (extracting components, hooks, styles), not from deleting explanatory content.
