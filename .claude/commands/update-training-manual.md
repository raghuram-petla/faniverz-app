# Update Training Manual

Update `docs/ADMIN_TRAINING_MANUAL.md` to reflect the current state of the admin panel codebase. Supports two modes:

- **Incremental** (default): Update only sections affected by changes since the file was last modified
- **Full refresh** (`$ARGUMENTS` contains "full"): Regenerate the entire document by auditing the full admin codebase

## Worktree Setup

Before starting any work, ensure you are operating in a git worktree:

1. **If already in a worktree** (current directory path contains `~/faniverz-worktrees/`): proceed in the current directory.
2. **If NOT in a worktree**: Create one:
   ```bash
   git worktree add ~/faniverz-worktrees/training-manual-$(date +%s) -b training-manual-$(date +%s)
   ```
   Then `cd` into the worktree directory before proceeding.

**All file reads, edits, and commits must happen inside the worktree.** Never modify files in the main working directory.

## Mode Detection

1. Check if `$ARGUMENTS` contains the word "full" (case-insensitive).
   - If **yes** → Full Refresh mode
   - If **no** → Incremental mode

---

## Incremental Mode (default)

### Phase 1 — Identify Changes Since Last Update

1. Find the last commit that touched the training manual:
   ```bash
   git log -1 --format="%H %ci" -- docs/ADMIN_TRAINING_MANUAL.md
   ```
2. Get all admin-related files changed since that commit:
   ```bash
   git diff --name-only <last-commit>..HEAD -- admin/src/ shared/
   ```
3. Also check for new migration files that may affect admin features:
   ```bash
   git diff --name-only <last-commit>..HEAD -- supabase/migrations/
   ```
4. Get the commit log since last update for context:
   ```bash
   git log --oneline <last-commit>..HEAD -- admin/src/ shared/ supabase/migrations/
   ```

If no relevant files have changed, print `### No admin changes since last training manual update — nothing to do` and stop.

### Phase 2 — Map Changes to Manual Sections

Read the changed files and map them to affected training manual sections. Use this mapping:

| Changed Path Pattern                           | Affected Manual Sections                |
| ---------------------------------------------- | --------------------------------------- |
| `admin/src/app/(dashboard)/movies/`            | §7 Movies                               |
| `admin/src/app/(dashboard)/cast/`              | §8 Artists                              |
| `admin/src/app/(dashboard)/production-houses/` | §9 Production Houses                    |
| `admin/src/app/(dashboard)/ott/`               | §10 OTT Platforms                       |
| `admin/src/app/(dashboard)/in-theaters/`       | §11 In Theaters                         |
| `admin/src/app/(dashboard)/surprise/`          | §12 Surprise Content                    |
| `admin/src/app/(dashboard)/feed/`              | §13 News Feed                           |
| `admin/src/app/(dashboard)/reviews/`           | §14 Reviews & Comments                  |
| `admin/src/app/(dashboard)/comments/`          | §14 Reviews & Comments                  |
| `admin/src/app/(dashboard)/notifications/`     | §15 Notifications                       |
| `admin/src/app/(dashboard)/users/`             | §16 App Users, §17 Admin Management     |
| `admin/src/app/(dashboard)/audit/`             | §18 Audit Log                           |
| `admin/src/app/(dashboard)/validations/`       | §19 Validations                         |
| `admin/src/app/(dashboard)/profile/`           | §20 Profile Management                  |
| `admin/src/app/(dashboard)/sync/`              | §6 Sync                                 |
| `admin/src/app/(dashboard)/page.tsx`           | §5 Dashboard                            |
| `admin/src/components/`                        | Sections using those components         |
| `admin/src/hooks/`                             | Sections using those hooks              |
| `admin/src/lib/`                               | Multiple sections (check usage)         |
| `admin/src/app/login/`                         | §2 Getting Started                      |
| `shared/`                                      | Multiple sections (check usage)         |
| `supabase/migrations/`                         | Any section involving DB schema changes |

For each affected section, read both:

- The **current manual section** (from `docs/ADMIN_TRAINING_MANUAL.md`)
- The **current source code** for that feature area

### Phase 3 — Report Differences

Present findings as a checklist:

```
## Training Manual Update Report (Incremental)

### Changes Since Last Update
- Last updated: <date> (<commit hash>)
- Commits since: <count>
- Files changed: <count>

### Sections Requiring Updates
- [ ] §7 Movies — New "bulk edit" button added to movie list page
- [ ] §6 Sync — Search now shows language badge on results
- [x] §8 Artists — No changes needed (component rename only, no UX change)

### Sections Not Affected
- §1-§5, §9-§20, Appendices — No relevant code changes
```

**Do NOT wait for confirmation.** This is an employee training document — every inaccuracy must be fixed. Proceed directly to Phase 4 and apply all identified updates.

---

## Full Refresh Mode

### Phase 1 — Comprehensive Audit

Audit the **entire** admin codebase to build a complete picture. Use Explore agents in parallel for speed. Do NOT modify any files during this phase.

#### 1.1 Route Structure & Pages

Scan `admin/src/app/(dashboard)/` recursively. For each route:

- What pages exist (list, detail, create, edit)
- What forms/tables/actions are available
- What role restrictions apply

#### 1.2 Authentication & Roles

Read `admin/src/app/login/`, auth middleware, and role-related code:

- Login flow
- Role hierarchy and permission checks
- Impersonation feature

#### 1.3 Shared Components

Scan `admin/src/components/` for UI patterns:

- Dock (save/discard bar)
- Forms, tables, modals, image uploaders
- Language switcher, sidebar, header

#### 1.4 Hooks & Business Logic

Scan `admin/src/hooks/` and `admin/src/lib/`:

- Data fetching patterns
- Form state management
- Unsaved changes warning
- TMDB integration

#### 1.5 Database Schema

Read latest migration files to understand current schema:

- Tables, columns, relationships
- RLS policies and role scoping

#### 1.6 Shared Code

Scan `shared/` for types, constants, and utilities used by the admin panel.

### Phase 2 — Compare Against Manual

Read the **entire** `docs/ADMIN_TRAINING_MANUAL.md`. For each section (§1–§22 + Appendices), compare what the manual says against what the code actually does. Record:

- **Missing features**: Things in the code not documented in the manual
- **Removed features**: Things in the manual that no longer exist in the code
- **Changed behavior**: Things that work differently now than what the manual describes
- **New pages/routes**: Admin pages that have no corresponding manual section
- **Outdated screenshots/diagrams**: ASCII diagrams or descriptions that no longer match the UI

Present as:

```
## Training Manual Full Refresh Report

### Section-by-Section Audit

#### §1 Product Philosophy & Design Principles
- [x] Accurate — no changes needed

#### §6 Sync — Where All Data Begins
- [ ] Missing: Language badge now shown on search results
- [ ] Missing: Bulk sync sections feature
- [ ] Changed: Search debounce increased from 300ms to 500ms

#### §7 Movies — The Core Entity
- [ ] Missing: New "Keywords" tab on movie edit page
- [ ] Removed: "Import All" button no longer exists
...

### New Sections Needed
- [ ] New page: `/reports` — not covered in any existing section

### Sections to Remove
- (none — or list any that reference removed features entirely)

### Summary
- Sections accurate: X/25
- Sections needing updates: Y/25
- New sections needed: Z
```

**Do NOT wait for confirmation.** This is an employee training document — every inaccuracy must be fixed. Proceed directly to Phase 3 and apply all identified updates.

### Phase 3 — Apply Surgical Updates

**CRITICAL — DO NOT REWRITE THE DOCUMENT. DO NOT REWRITE SECTIONS. DO NOT REPHRASE EXISTING TEXT.**

Full refresh does NOT mean "regenerate from scratch." It means "audit everything and fix what's wrong." The existing manual was carefully written. Your job is to make **minimal, targeted edits**:

- **Missing feature?** → Insert a new paragraph or bullet point describing it, in the style of the surrounding text.
- **Removed feature?** → Delete only the sentences/paragraphs about that feature. Do not touch anything else in the section.
- **Changed behavior?** → Edit only the specific sentence(s) that describe the old behavior. Change them to describe the new behavior. Leave every other sentence untouched.
- **New admin page with no section?** → Add a new section in the logical position, following the structure of existing sections.

**What you MUST NOT do:**

- Do NOT rewrite a section "in your own words" — the existing wording is intentional
- Do NOT reorganize paragraphs or bullet points within a section
- Do NOT change formatting, heading levels, or markdown style of existing content
- Do NOT add content that wasn't identified in the Phase 2 report
- Do NOT rephrase sentences that are already accurate — even if you think your version is "better"
- Do NOT replace ASCII diagrams that are still correct
- Do NOT touch sections marked as accurate in the Phase 2 report — not even whitespace

**Think of yourself as a copy editor with a red pen, not an author rewriting a chapter.** You are making corrections and additions to an existing document. If a section is 95% correct, you change only the 5% that's wrong — you do not rewrite the 95%.

For each confirmed update, use the Edit tool to make the smallest possible change that fixes the issue. Prefer multiple small edits over replacing large blocks.

---

## Phase 4 — Apply Updates (Both Modes)

When applying updates to `docs/ADMIN_TRAINING_MANUAL.md`:

### Writing Style & Tone

- Write for **non-technical employees** (content editors, moderators) — not developers
- Use **second person** ("you", "your") consistently
- Use **present tense** ("Click the button" not "You will click the button")
- Be **specific and actionable** — "Click the red Save button in the bottom dock" not "Save your changes"
- Include **what happens next** after each action — "After clicking Save, the dock disappears and a green success toast appears"
- Use **bold** for UI element names: **Save**, **Discard**, **Language Switcher**
- Use `code formatting` for technical values: field names, API values, enum values
- Use **> Note:** callouts for important warnings or role-specific behavior
- Use ASCII diagrams for layouts where helpful
- Use tables for permission matrices and structured comparisons
- Keep the same numbered section structure (§1–§22 + Appendices)

### Content Rules

- **Accuracy first**: Every statement must match what the code actually does. Never guess or assume behavior — read the source.
- **Include role context**: When a feature is role-restricted, say which roles can use it
- **Include edge cases**: What happens with empty data? What happens when the user has no permission?
- **Cover the dock pattern**: For any page with forms, explain the save/discard dock behavior
- **Cover unsaved changes warning**: For any page using `useUnsavedChangesWarning`, mention the browser warning on navigation
- **Mention keyboard shortcuts**: If a page has keyboard shortcuts, include them
- **Document error states**: What error messages might appear and what to do about them
- **Theme awareness**: If a feature renders differently in dark/light mode, mention it

### Structural Rules

- Update the **Table of Contents** if any sections are added, removed, or renamed
- Update the **Version** and **Last Updated** date in the header
- Update **Appendix B (Glossary)** if new terms are introduced
- Update **Appendix C (Role Permission Matrix)** if permissions changed
- If a brand new feature area is added, insert it in the logical position and renumber subsequent sections
- Keep section ordering consistent: Overview → How to Access → Step-by-step → Tips/Notes → Role-specific behavior

## Phase 5 — Verify

After updating:

1. **Check internal consistency**: Ensure cross-references between sections are correct (e.g., "See §6 Sync" actually matches §6)
2. **Check Table of Contents**: Every section header must have a matching TOC entry
3. **Check role references**: Every mention of role permissions must match Appendix C
4. **Check for orphaned content**: No section should reference features that don't exist in the code
5. **Spot-check accuracy**: Read 2-3 updated sections and verify against the actual source code
6. **Word count**: Report the total line count — flag if the document exceeds 2500 lines (may need to split into sub-documents)

## Phase 6 — Regenerate PDF

After the markdown file is finalized, regenerate the PDF using `md-to-pdf` (via npx) with the config file:

```bash
npx md-to-pdf docs/ADMIN_TRAINING_MANUAL.md --config-file docs/.md-to-pdf-config.json 2>&1
```

This uses Chromium under the hood and produces a styled A4 PDF at `docs/ADMIN_TRAINING_MANUAL.pdf` with a header ("Faniverz Admin Panel — Employee Training Manual"), page numbers, and "Confidential" footer. The config file at `docs/.md-to-pdf-config.json` controls margins, format, and header/footer templates.

> **Important:** Make sure the PDF file is not open in Preview or any other viewer before running this command — macOS locks open PDF files and the write will silently fail.

## Final Report

```
## Training Manual Update Complete

### Mode: Incremental / Full Refresh
### Sections Updated: X
### Sections Added: Y
### Sections Removed: Z
### Total Lines: N
### PDF: Regenerated / Skipped (reason)
### Version: X.Y → X.Z
### Last Updated: <new date>
```

## Rules

- **NEVER rewrite the document or rewrite sections** — both incremental and full refresh modes make surgical, minimal edits to the existing document. The existing text is intentional. Change only what is wrong or missing. Leave everything else exactly as-is — same wording, same formatting, same order.
- **Never fabricate behavior** — every UI description must come from reading actual source code
- **Never remove sections without confirmation** — even if the feature no longer exists, confirm with the user first
- **Non-technical audience** — avoid code snippets, API details, or developer jargon in the manual itself
- **Do not modify source code** — this skill only updates documentation files
- **Preserve the employee-friendly tone** — this is training material, not API docs
- **Do NOT wait for confirmation** — apply all identified inaccuracies immediately. The manual must match the code.
- **Always update the version number** — increment minor version for incremental updates, major version for full refresh
- **Always attempt PDF regeneration** after updating the markdown
- **Full refresh ≠ full rewrite** — "full" refers to the scope of the _audit_ (all sections), not the scope of the _edits_. The edits are always minimal.
