# Faniverz Admin Panel — Design Principles

> Extracted from 189 development sessions. This document captures every visual, interaction, and behavioral design decision made during the build. Follow these principles for consistency.

---

## 1. Overall Philosophy

- **"Clean and simple without so many aesthetics"** — the admin panel is functional, not decorative
- **"Show don't hide"** — never hide fields when empty; show "Not set" in `text-on-surface-disabled` instead
- **"No partial data"** — partial imports are unacceptable; either complete fully or not at all
- Google OAuth only for login (email/password removed)
- Favicon uses the Faniverz app icon (not default Vercel/Next.js icon)

---

## 2. Color Palette & Theming

### Theme Tokens

- Uses `next-themes` for dark/light mode with semantic color tokens
- `bg-surface-card`, `text-on-surface`, `text-on-surface-disabled` — never hardcode colors

### Theme-Aware Status Colors

| State                     | Dark Theme  | Light Theme |
| ------------------------- | ----------- | ----------- |
| Changed/Warning           | `amber-400` | `amber-600` |
| Old value (strikethrough) | `red-400`   | `red-600`   |
| New value / Success       | `green-400` | `green-600` |

### Rules

- Every admin page must work in both themes
- Hardcoded colors (`text-amber-400` without dark variant) are too washed out on light backgrounds
- All dropdowns, docks, panels, and modals must be theme-aware
- Country field text must be bright enough to read (cited multiple times as "too dim")

---

## 3. Sidebar Navigation

### Layout

- Collapsible sidebar with sections: Content (movies, actors), Moderation, Admin/User Management
- Collapse toggle on the same row as "CONTENT" heading (not at the bottom)

### Branding

- Header text: "ADMIN" (not "Admin Panel" — shorter and more authoritative)
- `text-xl`, `select-none`
- Collapsed state shows F-in-circle icon (same as mobile app icon) with transparent background
- Never show just the letter "F" or an icon with black background

### Navigation Items

- Comments, watchlist, follows moved under "Moderation" section
- Dashboard link goes to dashboard (not redirect to movies — that was a routing bug)

---

## 4. Breadcrumb Navigation

- Required on all subpages: `ADMIN → SECTION → PAGE NAME`
- Remove redundant H1/page title that duplicates breadcrumb info
- No excessive gap between breadcrumbs and content

---

## 5. The Unsaved Changes Dock

This was the most heavily iterated component. Every detail matters:

### Position & Layout

- **Fixed to bottom of page** — always visible, never requires scrolling
- Docked to the main content area (does NOT overlap the left sidebar)
- Full-width within content area (consistent across all pages)
- Rounded top corners, 3D/elevated appearance with deep drop shadow

### Visual Design

- Background: lighter shade (not fully dark — "It's looking a little dark. Not so good.")
- **Pulsing dot** for "Unsaved changes" indicator (must not be removed)
- Scroll indicators (up/down arrows) when dock content overflows
- Discard button must look like a button (not plain text)

### Behavior

- Captures ALL field types: TMDB ID, focal point changes, dropdown selections, indicator toggles, date fields
- Re-selecting the original value clears the unsaved state (dock disappears)
- Success "Saved" toast appears inside the dock, then disappears
- Discard must not cause page jumps/scroll
- Sufficient bottom padding in page so dock doesn't overlap last content item

### Required Hook

- **Every admin form page** must call `useUnsavedChangesWarning(isDirty)`
- Edit pages: `isDirty` = compare current state to `useRef` initial values
- Create pages: `isDirty` = true when any field is filled in
- Warns on: browser reload, back button, sidebar navigation, tab switching

---

## 6. Form Patterns

### General Rules

- **Never auto-save** — only save on explicit "Save Changes" click (auto-save on drag-and-drop reorder was rejected: "WTF?")
- Save button disabled when no changes, enabled only when dirty
- Hide Save button when disabled (don't show a disabled button)
- After save: stay on same page, show inline success message (never navigate away)
- Remove browser number spinners from integer fields (TMDB IDs should not increment/decrement)

### Dropdowns & Search

- Country dropdowns: searchable by keyboard, arrow key navigation, show full name + flag (not short code)
- Use common reusable country dropdown component across all pages
- Typeahead search (not plain dropdowns) for entities with many records (production houses, actors)
- Searchable platform dropdown: show only platforms available in selected country
- First dropdown on movie edit was "too small" — make it larger

### Quick-Create Inline

- From movie edit, users can create actors/production houses inline without navigating away
- Search for non-existent entity → offer quick-create option in the form

### Form Layout

- Side-by-side fields where appropriate ("Original Language" + "Featured Movie" share a row)
- Director field removed from Basic Info (managed in Cast & Crew — no duplicate data entry)

---

## 7. Movie Edit Page

### Layout

- Form on left, live preview on right (side-by-side preferred over tabs)
- Sticky horizontal section navigation: Basic Info, Cast & Crew, Media, Theater Runs, etc.
- Active section highlights in red as user scrolls
- Last section highlights when fully scrolled to bottom

### Cast & Crew

- Two separate sections (not interleaved — "This is not good")
- Drag-and-drop reordering
- Actor photos visible in the list
- Full-text search across all actors (not partial/limited)
- Adding unknown actors fails with validation (no free-text names)

### Preview Panel

- Default tab: "Detail" (not "Spotlight" — Detail shows both poster and backdrop)
- Must honor safe area (apply `safeAreaTop` from device config)
- Nav buttons and content positions must match the real mobile app
- Device selector: iPhone sizes, Android sizes

---

## 8. Image & Poster Management

### Upload & Display

- Direct upload to R2 storage — never manually type/paste URLs
- URL field is read-only or hidden; upload button is primary interaction
- Only `faniverz.com` domain URLs are valid (no localhost, no TMDB direct)
- Image variants: `_sm`, `_md`, `_lg`, `_xl` auto-generated on upload

### Poster/Backdrop Management

- Auto-detect poster vs backdrop from image dimensions (removed radio button)
- "Set as main poster" checkbox next to Upload button (saves space)
- After upload, form stays open (not auto-close)
- Gallery card badges ("Main Poster"/"Main Backdrop") removed — main selections visible in dedicated selector above

### Variant Display

- Show which variants exist vs missing: "X out of 4 variants ready"
- Use `_sm` for thumbnails (don't load large variants for tiny thumbnails)
- Show images in natural aspect ratio (not forced squares)
- Hide focal point percentages from UI (meaningless to users) — only show "Reset to Center"

### Focal Point

- Focal point picker lives on the backdrop edit tab (NOT the preview tab)
- Portrait images: top-to-bottom slider
- Landscape images: left-to-right slider
- Selected region must exactly match what's visible in preview
- Single setting applies to both spotlight and movie detail hero

### Image Pipeline Visibility

- Standardize across all entity types (movies, actors, production houses)
- The movies/posters page approach is canonical — use it everywhere

---

## 9. Tables & Lists

### General

- Pagination on all list pages (actors, movies — consistency)
- Search across all records server-side (not just current page)
- Entity names in all displays (never raw UUIDs)

### Movie Table

- Movie title/name cell links to edit page (not entire row clickable — that broke Actions column alignment)
- Search box text must not be cut off — make box longer (not wider) or show ellipsis

### Controls

- Filters and buttons don't need full page width — center with required width for visual balance
- Don't show "0" for gap counts when data hasn't loaded yet

---

## 10. "In Theaters" Management

### Toggle + Batch Save Pattern

- Toggle movie in/out → adds to pending changes list → "Save Changes" commits all at once
- Never auto-commit on toggle

### Pending Changes Panel

- Sticky/always-visible (user may never see it if they have to scroll)
- Toggling must not cause page jumps/shifts
- Show movie icon + name + relevant date (only one date, not two)
- "Remove" button was confusing → redesigned to toggle pattern

### Search Within

- Movies already "In Theaters" show with an indicator (not hidden from results)

---

## 11. Sync / Import UX

### Granular Controls

- Support: specific movie, specific actor, specific month/year, custom combinations
- Basic two-button approach (TMDB sync + OTT sync) was insufficient

### Progress Display

- Progress indicator directly below the import button (not at bottom of page)
- Show: posters syncing count, backdrops syncing count, iteration number
- Use "Iteration 1, 2..." not "Attempt" (attempt implies possible failure)

### During Import

- Deselect All button disabled
- Provide cancel option for current + queued imports
- Warn when switching browser tabs during active import
- Unsaved changes warning: "N movie imports are in progress and will be cancelled if you leave" (context-specific, not generic)

### Search Results

- Actors list appears before movies list (fewer actors, easier to miss if at bottom)
- Search term shown above results
- No sub-tabs within Discover (rejected as "yuck")
- Each import section visually independent (stacked, centered, not side-by-side)

---

## 12. Audit Log

### Display

- Show entity names (not UUIDs)
- Show only the DIFF of what changed (not entire payload)
- Detail panel scrollbar scoped to panel only (not entire page)

### Revert

- Revert button on entries reverses the change
- Reverted entries marked "reverted on [timestamp]"
- Cannot re-revert (button hidden after first revert)

### Freshness

- Must refresh after changes without browser reload
- Recorded via database triggers (not manual client calls)

### Impersonation Tracking

- Records both real admin AND impersonated user
- Changes appear in both users' audit trails

---

## 13. OTT Platform Management

### Country-First Design

- Group OTT entries by country (not flat list with confusing duplicates)
- Country dropdown first → show only platforms available in that country
- "Add Country" button must work (selection must register, not silently fail)
- Hover tooltips on country codes show full country name

### Platform Entry

- Upload PNG logo (no "logo text" field, no brand color, no display order)
- TMDB ID is optional
- "OTT platform aliases" concept removed — follow JustWatch approach

### Form Position

- "Add platform" form appears at the bottom (not jumping to top)

---

## 14. Users & Access Control

### Role Hierarchy

`root > super_admin > admin > production_house_admin`

### Visibility Rules

- Root sees everything
- Super admin sees admins + PH admins (NOT root users)
- Admin sees PH admins only
- PH admin sees no one

### Impersonation

- Can only impersonate roles below yours
- Super admin cannot impersonate other super admins
- Impersonated actions are tracked in audit log

### Blocking

- Block action requires mandatory reason (in `BlockAdminModal`)
- Blocked users see "Access Blocked" screen with reason
- Self-blocking prevented in UI and database
- Hierarchy enforced: can only block roles below yours

### User Display

- Show full display name (from Google OAuth), not just email
- Status filter tabs: Active / Blocked / All
- Invite button hidden for non-super-admins

---

## 15. Production Houses

- Filter by country on list page
- Show TMDB ID, country, all TMDB metadata
- Country field: read-only if TMDB-linked and set; editable if not set
- Typeahead search dropdown (not plain dropdown when hundreds exist)
- Same image pipeline UI as movies/posters page

---

## 16. Profile Photo Management (Admin Users)

Three options (not two):

1. **Change photo** — upload custom
2. **Remove photo** — clear entirely
3. **Reset to Google avatar** — restore OAuth profile photo

- Default shows Google profile photo if no custom photo set
- Never show broken image when no photo exists — use placeholder

---

## 17. Dashboard

### Stats Cards

- Movie counts, crew/cast counts, feed votes, platform data
- Pre-computed counts (not `SELECT COUNT(*)` table scans)
- Show skeleton/spinner while loading (never "0" as placeholder)

### Shortcuts

- Every major section has a shortcut card
- Short labels: "In Theaters" (not "Manage In Theaters")

### Containers

- Auto-expand to full list height (no scroll bars within containers — "bad design")

---

## 18. Responsive Preview

- Preview available for: iPhone (multiple sizes), Android (multiple sizes)
- Device selector in movie edit page
- Focal point stored per-entity, applied consistently across all preview contexts

---

## 19. Centralized UI Components

| Component         | Description                       | Key Detail                                             |
| ----------------- | --------------------------------- | ------------------------------------------------------ |
| `Button`          | Primary/secondary/danger variants | `bg-red-600 hover:bg-red-700 text-white`               |
| `FormField`       | Label + input/select/textarea     | Extracted to prevent style drift                       |
| `Card`            | Section wrapper                   | `bg-surface-card border border-outline rounded-xl p-4` |
| `SearchInput`     | Debounced search + spinner        | `pr-10` padding prevents text overlapping spinner      |
| `LoadMoreButton`  | Pagination                        | `fetchNextPage` + disabled state                       |
| `BlockAdminModal` | Blocking confirmation             | Mandatory reason field                                 |

---

## 20. Cross-Cutting Rules

1. **Conservative sizing first** — for sizing/spacing changes, make conservative first attempt. Expect 2–3 rounds of feedback.
2. **Never make unasked-for changes** — if asked to fix X, change ONLY X.
3. **Consistency** — if a pattern exists on one page, all similar pages follow it.
4. **No localhost URLs** — always use environment variables for endpoints.
5. **Both themes always** — check dark and light before declaring done.
6. **Show don't hide** — empty fields show "Not set", not nothing.
7. **Labels matter** — short, direct labels. "In Theaters" not "Manage In Theaters". "ADMIN" not "Admin Panel".
