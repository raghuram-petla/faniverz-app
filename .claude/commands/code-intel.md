# Code Intel

Add structured comments to source files that give future bug-hunting agents rich context for spotting inconsistencies, implicit assumptions, and latent bugs. **This skill ONLY adds comments. It MUST NOT make any functional changes, refactors, or 300-line fixes.**

## Guiding Principle

Bug-hunting agents are fast at pattern-matching but lack domain context. They can spot `data.items.map(...)` but can't know whether `data.items` is guaranteed non-null by the caller or is a ticking crash. The comments this skill adds bridge that gap — they encode **what the developer assumed**, **what the data contract is**, and **what would break if those assumptions were violated**.

## Comment Taxonomy

Use these structured comment prefixes. Every comment added by this skill MUST use one of these prefixes so agents can grep for them.

### `// @contract:` — Input/Output Contracts

Describe what a function, hook, or component expects and guarantees.

```ts
// @contract: params.id is always a valid UUID from route params (Expo Router guarantees string)
// @contract: returns null when user is not authenticated — callers must handle null case
// @contract: mutationFn expects exactly { movieId: string, rating: number } — extra fields are stripped by Supabase
```

**Where to place**: At the top of exported functions, hooks, API functions, and component definitions.

### `// @assumes:` — Implicit Assumptions

Flag things the code silently depends on being true. These are the #1 source of bugs — when the assumption is violated, the code breaks in non-obvious ways.

```ts
// @assumes: `data` is non-null here because `enabled: !!userId` prevents query from running without userId
// @assumes: items are pre-sorted by created_at DESC from Supabase — no client-side sort needed
// @assumes: RLS policy filters rows to current user — no explicit .eq('user_id', userId) needed
// @assumes: this effect runs only once on mount (empty dep array) — if deps are added, the subscription will duplicate
// @assumes: Supabase returns created row with .select() — if .select() is removed, data will be null
```

**Where to place**: Inline, directly above the line that depends on the assumption.

### `// @nullable:` — Null/Undefined Risk Points

Mark every place where a value could be null/undefined, AND whether it's guarded.

```ts
// @nullable: user?.avatar_url — could be null for new users, falls back to PLACEHOLDER_AVATAR
// @nullable: data.movies — UNGUARDED — if query errors, data is undefined and .map() will crash
// @nullable: params.id — guaranteed by Expo Router but typed as string | string[]
```

**Where to place**: Inline, on the same line or directly above the nullable access.

### `// @sideeffect:` — External Effects

Mark code that reaches outside its scope — API calls, state mutations, navigation, storage writes. Bugs love hiding in side effects because they're invisible to static analysis.

```ts
// @sideeffect: INSERT into user_follows — creates a row; duplicate calls create duplicate rows if no unique constraint
// @sideeffect: invalidates ['feed'] query cache — causes refetch of entire feed on next render
// @sideeffect: writes to AsyncStorage — fire-and-forget, no error handling if storage is full
// @sideeffect: calls router.back() — will crash if there's no history stack (e.g., deep link entry)
```

**Where to place**: Directly above or on the line that triggers the side effect.

### `// @sync:` — Timing & Ordering Dependencies

Flag code where timing matters — race conditions, stale closures, async ordering.

```ts
// @sync: this setState may fire after unmount if the fetch resolves after navigation away
// @sync: cleanup sets cancelled=true but the Supabase subscription callback may still fire once
// @sync: refetchOnWindowFocus will re-trigger this query even if a mutation is in-flight
// @sync: depends on auth state being set BEFORE this component mounts — race if auth is async
```

**Where to place**: Inline, on the async/timing-sensitive code.

### `// @invariant:` — Things That Must Stay True

Conditions that, if violated, break the feature. Different from `@assumes` — invariants are **requirements**, assumptions are **beliefs**.

```ts
// @invariant: query key must match between useQuery and invalidateQueries — mismatch = stale data forever
// @invariant: Supabase table has unique constraint on (user_id, movie_id) — without it, duplicate follows are possible
// @invariant: theme.colors must have both dark and light variants — missing variant = crash in useTheme
// @invariant: route file path must match router.push() string exactly — typo = blank screen
```

**Where to place**: At the declaration site of the thing that must stay true.

### `// @boundary:` — System Boundary / Trust Boundary

Mark where data crosses a trust boundary (user input, API response, URL params, deep links). Bugs at boundaries are the most dangerous.

```ts
// @boundary: user input from TextInput — not sanitized, passed directly to Supabase .ilike()
// @boundary: API response — shape not validated at runtime, TypeScript types are compile-time only
// @boundary: URL params from deep link — could be any string, not validated as UUID
// @boundary: Supabase realtime payload — schema may differ from TypeScript type if migration is out of sync
```

**Where to place**: At the point where external data enters the application.

### `// @coupling:` — Hidden Dependencies Between Files

Mark when a change in one file would silently break another. These are invisible to agents scanning one file at a time.

```ts
// @coupling: if the Supabase select() columns change here, the TypeScript type in types.ts must also change
// @coupling: the query key ['movies', movieId] must match the invalidation in useToggleFollow
// @coupling: this component expects parent to provide SafeAreaView — rendering standalone will clip content
// @coupling: admin form field names must match Supabase column names exactly — mismatch = silent data loss
```

**Where to place**: At the coupled code, with a reference to the other file/location.

### `// @edge:` — Known Edge Cases

Document edge cases that are handled, partially handled, or intentionally ignored.

```ts
// @edge: empty list renders EmptyState — but zero-result search shows same component (no distinction)
// @edge: user with no avatar gets placeholder — but image component flashes broken-image before fallback loads
// @edge: pagination offset could be negative if user rapidly navigates — clamped to 0 here
// @edge: date comparison uses local timezone — will show wrong "today" for users in IST after midnight UTC
```

**Where to place**: At the edge case handling code, or at the code that's missing edge case handling.

## Execution Phases

### Phase 1 — File Inventory

Collect all source files that need annotation. Process in this order:

1. **API/data layer** (`src/api/`, `src/hooks/`, `admin/src/hooks/`) — annotate these first because they define the data contracts that components depend on
2. **Shared components** (`src/components/`) — annotate props contracts and rendering assumptions
3. **Screen components** (`app/`, `admin/src/app/`) — annotate data flow, navigation, and user interaction
4. **Utilities** (`src/utils/`, `src/constants/`) — annotate contracts and edge cases
5. **Stores** (`src/stores/`) — annotate state shape and mutation contracts

Skip exempt files: `.styles.ts`, `.test.ts`, `.test.tsx`, `__tests__/`, `.d.ts`, `.config.*`, `scripts/`, `.next/`

Use parallel agents to read files across layers simultaneously.

### Phase 2 — Annotate

For each file, read it fully and add comments using the taxonomy above. Follow these rules:

**What to annotate:**

- Every exported function/hook/component: Add `@contract` comment
- Every Supabase query: Add `@nullable`, `@assumes`, `@sideeffect` comments
- Every `useEffect`: Add `@sync` comment if async, `@assumes` comment for dep array
- Every TanStack Query hook: Add `@invariant` for query key, `@assumes` for enabled/staleTime
- Every mutation: Add `@sideeffect` for what it changes, `@sync` for race conditions
- Every place data enters from outside (params, API, user input): Add `@boundary`
- Every null/undefined access without guard: Add `@nullable: UNGUARDED`
- Every null/undefined access WITH guard: Add `@nullable` describing the guard
- Every cross-file dependency you notice: Add `@coupling`
- Every edge case you notice (handled or not): Add `@edge`

**What NOT to do:**

- Do NOT add comments that just restate the code: `// sets the name` above `setName(name)` — USELESS
- Do NOT add `@contract` to trivial getters/setters
- Do NOT over-annotate — if a line is obvious and has no hidden risk, skip it
- Do NOT make ANY functional changes — no fixing bugs, no adding optional chaining, no refactoring
- Do NOT fix 300-line violations — just add comments, even if the file goes over 300 lines
- Do NOT modify test files, style files, or config files
- Do NOT change imports, exports, types, or any code structure

**Density guideline**: Aim for 5-15 annotation comments per 100 lines of source code in complex files (API, hooks, screens). Simple utility files may need only 2-5. Don't pad for coverage — only annotate where context genuinely helps.

### Phase 3 — Verify No Functional Changes

After annotating each batch of files, run a verification:

```bash
# Check that only comment lines were added (no functional changes)
git diff --stat
```

For each modified file, review the diff to confirm ONLY comment lines (starting with `//`) were added. If any functional line was changed, **revert that specific change immediately**.

Then run type-check to confirm nothing broke:

**Mobile:**

```bash
npx tsc --noEmit
```

**Admin:**

```bash
cd admin && npx tsc --noEmit
```

Do NOT run full quality gates (ESLint, tests) — comments don't affect those, and running them wastes time. Only tsc to ensure no accidental syntax errors.

### Phase 4 — Summary Report

```
## Annotation Summary

### Files Annotated
| Layer | Files | @contract | @assumes | @nullable | @sideeffect | @sync | @invariant | @boundary | @coupling | @edge | Total |
|-------|-------|-----------|----------|-----------|-------------|-------|------------|-----------|-----------|-------|-------|
| API/Data | X | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Components | X | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Screens | X | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Utils/Stores | X | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Total** | **X** | ... | ... | ... | ... | ... | ... | ... | ... | ... | **N** |

### High-Risk Findings Surfaced During Annotation
(List any @nullable: UNGUARDED, @sync race conditions, or @coupling mismatches noticed — these are NOT fixed, just flagged for the next bug-hunt)

| # | Tag | File:Line | Finding |
|---|-----|-----------|---------|
```

## Rules

- **ONLY add comments.** Zero functional changes. Zero refactors. Zero 300-line fixes.
- **Use the taxonomy prefixes.** Every comment must start with `// @contract:`, `// @assumes:`, `// @nullable:`, `// @sideeffect:`, `// @sync:`, `// @invariant:`, `// @boundary:`, `// @coupling:`, or `// @edge:`
- **Both codebases** — annotate mobile (`app/`, `src/`) AND admin (`admin/src/`) unless explicitly scoped
- **Skip exempt files** — `.styles.ts`, tests, configs, types-only, scripts, generated
- **Verify with tsc** after each batch — catch accidental syntax errors from misplaced comments
- **Don't fix what you find.** If you notice a bug while annotating, add an `@nullable: UNGUARDED` or `@edge` comment describing it. Do not fix it. The bug-hunt skill will handle that.
- **Don't restate obvious code.** Only add comments that provide context a bug-hunting agent wouldn't have from the code alone.
- **Preserve existing comments.** Don't modify, move, or delete any existing comments. Add new annotation comments alongside them.
