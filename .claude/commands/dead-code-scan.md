# Dead Code Scan

Systematically detect and remove dead code across the mobile app (`app/`, `src/`), admin dashboard (`admin/src/`), and shared modules (`shared/`).

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `.claude/worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add .claude/worktrees/dead-code-$(date +%s) -b dead-code-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, quality gates, and commits must happen inside the worktree.** Never modify files in the main working directory.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-report-fix cycle, immediately start a new scan from Phase 1. Keep looping until **3 consecutive runs find zero dead code**. Track the run counter:

```
Run 1 → found 8 items → fix → Run 2 → found 2 items → fix → Run 3 → found 0 → Run 4 → found 0 → Run 5 → found 0 → DONE (3 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–3.5 cycle (scan, report, fix, independent review, verify)
- A "clean run" means Phase 1 found exactly 0 dead code items across all 7 categories
- The 3-clean-run counter resets to 0 if any dead code is found
- Between runs, print: `### Run N complete — {X items found | clean} (consecutive clean: M/3)`
- After 3 consecutive clean runs, print: `### Dead Code Scan complete — 3 consecutive clean runs achieved`

**CRITICAL — No shortcuts allowed:**

- **Every single run MUST perform a full scan.** You MUST actually read source files and search for usage in every iteration — no skipping, no "nothing changed so it's clean", no assuming previous runs were thorough enough.
- **Launch parallel Agents** for each scan to ensure independent, thorough review. Do not rely on memory of previous runs.
- **Never declare a run "clean" without reading the actual code.** If you cannot prove you searched for usage in that run, it doesn't count.
- A clean run requires actively scanning and finding nothing — not passively assuming nothing changed.

## Phase 1 — Scan

Work through each category below. For every finding, record: **file path**, **line number(s)**, **symbol name**, and **category**. Do NOT modify any files during this phase.

**Agent strategy**: Launch **parallel agents** to scan different categories simultaneously. Each agent should use Glob, Grep, and Read tools to find dead code.

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

Within `__tests__/` directories and `.test.` files, find helper functions, mock factories, and test fixtures defined but never called. Clean these up automatically — no need to wait for user confirmation.

## Phase 2 — Report

Present findings as markdown tables grouped by category:

```
## Dead Code Report (Run N)

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

### Category 7: Unused Test Mocks (X found)
| File | Line | Symbol | Confidence |
|------|------|--------|------------|
```

**Confidence ratings**:

- **High**: No references found anywhere, safe to remove
- **Medium**: Only referenced in tests or edge-case pattern — review recommended
- **Low**: Might be used dynamically or via framework convention — manual review required

End with a summary count per category.

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL High and Medium confidence items. Skip Low confidence items (report only).

## Phase 3 — Cleanup

Remove in safest-first order:

1. Commented-out code (Category 5)
2. Unused style keys (Category 6)
3. Unused exports (Category 1) — remove `export` keyword if used locally, delete declaration if unused entirely
4. Backwards-compat re-exports (Category 4) — only if no consumers use the re-export path
5. Unused files (Category 2) — delete file AND remove from barrel `index.ts`
6. Unused dependencies (Category 3) — remove from `package.json` only, do NOT run install
7. Unused test mocks (Category 7)

### Cleanup Workflow

1. **Group related removals** — batch removals that touch the same file together
2. **Remove the dead code** — apply the minimal removal
3. **Run quality gates** after each category batch:
   - Mobile: `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
   - Admin: `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`
4. **If any check fails**: Read the error, revert the specific removal that caused it, note as false positive, re-run gates
5. **Check 300-line limit** on all modified files (removals should shrink files)

After cleanup, proceed to Phase 3.5 (Independent Review) before looping back.

## Phase 3.5 — Independent Review

**Purpose**: An independent AI agent audits every removal from Phase 3 to catch false positives that passed quality gates but are still wrong (e.g., symbols used via dynamic access, framework conventions, or cross-boundary references that grep missed).

This review agent has **no knowledge of Phase 1–3's reasoning** — it starts fresh and independently verifies each removal.

### How to run

Launch a **separate Agent** (`subagent_type: "general-purpose"`) with the following instructions:

1. **Get the diff**: Run `git diff` (unstaged) and `git diff --cached` (staged) to see everything removed in this run
2. **For each removed symbol/file/dependency**, independently verify it is truly unused:
   - **Removed exports**: Search the entire codebase (including tests, configs, and barrel files) for any reference to the symbol. Check both `@/` alias and relative import paths. Check for dynamic access patterns (`obj[key]`, `require()`, string interpolation)
   - **Removed files**: Verify no file imports it (alias and relative paths). Check for dynamic `require()` or `import()` calls that might reference it
   - **Removed dependencies**: Search all source files AND config files for any reference. Check for sub-path imports (`pkg/submodule`)
   - **Removed style keys**: Check for dynamic style access (`styles[variable]`) in the component
   - **Removed re-exports**: Verify no consumer uses the re-export path
3. **Flag any removal that looks wrong** — where the symbol/file/dependency IS still referenced somewhere
4. **Return a structured report**: list of removals to revert with file path, symbol, and reason

**The review agent must actually read files and search — not just reason from the diff.** It must use Grep, Glob, and Read tools to verify.

### After review

- **If the review agent flags removals to revert**: Revert those specific removals (restore the deleted code), note them as false positives in the final report, and re-run quality gates
- **If the review agent finds no issues**: Proceed to the next scan loop

### Rules for the review agent

- It must NOT rely on or reference any findings from Phase 1–3 — it works only from the git diff
- It must search broadly: both mobile (`app/`, `src/`) and admin (`admin/src/`) codebases, plus `shared/`, tests, and configs
- It must resolve path aliases (`@/*` → `src/*`, `@shared/*` → `shared/*`)
- It should flag conservatively — better to restore a "maybe used" symbol than to let a false positive through
- Dynamic access patterns (`styles[key]`, `hooks[name]`, computed property access) are strong signals to revert

## Phase 4 — Final Report (after 3 consecutive clean runs)

```
## Dead Code Scan — Summary

### Items Removed (across all runs)
| # | Category | File(s) | Symbol/Item | Action |
|---|----------|---------|-------------|--------|

**Removed**: X exports, Y files, Z style keys, W commented blocks, V re-exports, U test mocks
**Dependencies removed from package.json**: [list]
**False positives reverted**: [list with explanation]

### Quality Gates
- Mobile: PASS/FAIL (X suites, Y tests)
- Admin: PASS/FAIL (X suites, Y tests)
- 300-line limit: All files compliant

### Stats
- Total runs: N
- Total items found and removed: M
```

## Rules

- Never remove exports from route/page files — framework entry points
- Never remove API contract types or `Props` interfaces
- Never modify migration files (`supabase/`) or config files
- Always resolve both path alias (`@/`, `@shared/`) and relative import forms
- Always search test files when checking export usage
- Conservative: when in doubt, report as Low confidence and skip removal
- No new npm packages — use grep/glob/read only
- Respect the 300-line file limit (removals should shrink files)
- Admin ESLint uses `--max-warnings 0`
- Jest uses `--forceExit` (TanStack Query timer leaks)
- **No new features** — only remove dead code
- **Minimal changes** — don't refactor surrounding code beyond the removal
