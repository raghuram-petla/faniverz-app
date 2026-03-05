# Dead Code Scan

Systematically detect and remove dead code across the mobile app (`app/`, `src/`), admin dashboard (`admin/src/`), and shared modules (`shared/`).

## Phase 1 — Scan

Work through each category below. For every finding, record: **file path**, **line number(s)**, **symbol name**, and **category**. Do NOT modify any files during this phase.

### Category 1: Unused Exports

For each `.ts` and `.tsx` source file (excluding `node_modules`, `.next`, `__tests__`, `.test.`, `.d.ts`, `jest.setup`, `scripts/`), find every named `export` (functions, constants, types, interfaces, components). Then search the entire codebase to verify each export is imported somewhere else.

**Approach**: For every file, read it and extract all exported symbols. For each symbol, search for imports of that symbol. A symbol is "unused" if it is exported but never imported by any other file.

**Search scope for mobile exports**: `app/`, `src/`, `shared/`, and `__tests__/` directories (consumers include test files).
**Search scope for admin exports**: `admin/src/` directory and `shared/`.
**Search scope for shared exports**: Both mobile (`app/`, `src/`) and admin (`admin/src/`).

**Path alias resolution**: `@/*` resolves to `src/*` and `@shared/*` resolves to `shared/*`. When searching for imports, check both alias forms and relative forms (`./`, `../`).

**Do NOT flag as dead**:

- Exports from route/page files (`app/**/*.tsx`, `admin/src/app/**/*.tsx`) — consumed by the framework
- The `default export` from `src/i18n/index.ts` — side-effect import
- Type exports that define API contracts or database row shapes (Supabase table types, shared DTOs)
- Exports from barrel files (`index.ts`) — check the underlying source file instead. A barrel re-export is only dead if the underlying source export is dead
- React component `Props` interfaces — part of the component contract even if only used in the same file

### Category 2: Unused Files (Orphans)

Find source files never imported by any other source file.

```bash
find . \( -name '*.ts' -o -name '*.tsx' \) \
  ! -path '*/node_modules/*' ! -path '*/.next/*' ! -path '*/__tests__/*' \
  ! -name '*.test.*' ! -name '*.d.ts' ! -name '*.config.*' \
  ! -name 'jest.setup*' ! -path '*/scripts/*' ! -path '*/.expo/*' \
  | sort
```

For each file, derive its import path (with and without extension, with path alias resolution) and search for any file that imports it.

**Do NOT flag**:

- Route/page/layout files (`app/**/*.tsx`, `admin/src/app/**/page.tsx`, `layout.tsx`, `route.ts`)
- Entry points (`app/_layout.tsx`, `admin/src/app/layout.tsx`)
- Config files, global CSS (`globals.css`)
- Barrel `index.ts` files
- `src/i18n/index.ts`
- `.styles.ts` files with a companion component that imports them
- Supabase migration files

### Category 3: Unused npm Dependencies

Check each `dependencies` and `devDependencies` entry in both `package.json` (root) and `admin/package.json`. For each package, search for imports (`from 'pkg'`, `from 'pkg/'`, `require('pkg')`) in source files and references in config files (`babel.config.js`, `jest.config.*`, `eslint.config.*`, `app.json`, `next.config.*`, `postcss.config.*`, `tailwind.config.*`).

**Do NOT flag**:

- `typescript`, `@types/*` packages
- Babel/Jest/ESLint/Prettier plugins and presets
- `expo`, `react`, `react-dom`, `react-native` — framework peers
- `husky`, `lint-staged` — tooling
- `tailwindcss`, `@tailwindcss/*`, `postcss`, `autoprefixer` — build tools
- `sharp` — Next.js image optimization
- Packages referenced in any config file

### Category 4: Backwards-Compatibility Re-exports

Search for comments containing "backwards compat", "legacy", "deprecated", or "compat" near re-export statements. Verify whether any consumer uses the re-export path vs. importing directly from the new location.

Also check barrel files (`index.ts`) for re-exports where ALL consumers already import directly from the source module.

### Category 5: Commented-Out Code

Find blocks of 3+ consecutive commented-out lines that look like code (contain `import`, `export`, `const`, `let`, `function`, `return`, `if`, `else`, `=>`, `{`, `}`).

**Exclude**: JSDoc comments (`/**`, ` *`), eslint-disable directives, TODO/FIXME explanations that are natural language.

### Category 6: Unused Style Keys

For each `.styles.ts` file, extract all keys from `StyleSheet.create({...})`. Check the corresponding component file for references to `styles.<key>`.

**Convention**: `src/components/home/HeroCarousel.styles.ts` → `HeroCarousel.tsx`, `src/styles/tabs/home.styles.ts` → `app/(tabs)/home.tsx`.

**Skip entirely** if the component uses dynamic style access (`styles[variable]`).

### Category 7: Unused Test Mocks/Helpers

Within `__tests__/` directories and `.test.` files, find helper functions, mock factories, and test fixtures defined but never called. **Informational only** — report but let the user decide.

## Phase 2 — Report

Present findings as markdown tables grouped by category:

```
## Dead Code Report

### Category 1: Unused Exports (X found)
| File | Line | Symbol | Type | Confidence |
|------|------|--------|------|------------|

### Category 2: Unused Files (X found)
| File | Reason | Confidence |
|------|--------|------------|

### Category 3: Unused Dependencies (X found)
| Package | package.json | Confidence |
|---------|-------------|------------|

### Category 4: Backwards-Compat Re-exports (X found)
| File | Line | Re-export | Confidence |
|------|------|-----------|------------|

### Category 5: Commented-Out Code (X found)
| File | Lines | Preview | Confidence |
|------|-------|---------|------------|

### Category 6: Unused Style Keys (X found)
| Style File | Key | Component | Confidence |
|------------|-----|-----------|------------|

### Category 7: Unused Test Mocks (X found) — informational
| File | Line | Symbol | Confidence |
|------|------|--------|------------|
```

**Confidence ratings**:

- **High**: No references found anywhere, safe to remove
- **Medium**: Only referenced in tests or edge-case pattern — review recommended
- **Low**: Might be used dynamically or via framework convention — manual review required

End with a summary count per category.

## Phase 3 — Cleanup

**Wait for explicit user confirmation before proceeding.** Ask which categories to clean up.

Remove in safest-first order:

1. Commented-out code (Category 5)
2. Unused style keys (Category 6)
3. Unused exports (Category 1) — remove `export` keyword if used locally, delete declaration if unused entirely
4. Backwards-compat re-exports (Category 4)
5. Unused files (Category 2) — delete file AND remove from barrel `index.ts`
6. Unused dependencies (Category 3) — remove from `package.json` only, do NOT run install
7. Unused test mocks (Category 7) — only if user opts in

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
2. Revert the specific removal that caused the failure
3. Note it as a false positive
4. Re-run quality gates to confirm

## Phase 5 — Final Report

```
## Dead Code Cleanup — Summary

**Removed**: X exports, Y files, Z style keys, W commented blocks, V re-exports
**Dependencies flagged**: [list for user to remove manually]
**False positives reverted**: [list with explanation]
**Quality gates**: Mobile ✅/❌ | Admin ✅/❌

### Files Modified
- path/to/file.ts — removed unused export `symbolName`
```

## Rules

- Never remove exports from route/page files — framework entry points
- Never remove API contract types or `Props` interfaces
- Never modify migration files (`supabase/`) or config files
- Always resolve both path alias (`@/`, `@shared/`) and relative import forms
- Always search test files when checking export usage
- Conservative: when in doubt, report as Low confidence rather than removing
- No new npm packages — use grep/glob/read only
- Respect the 300-line file limit (removals should shrink files)
- Admin ESLint uses `--max-warnings 0`
- Jest uses `--forceExit` (TanStack Query timer leaks)
