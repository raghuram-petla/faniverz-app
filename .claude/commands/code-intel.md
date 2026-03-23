# Code Intel

Add structured comments to source files that give future bug-hunting agents rich context for spotting inconsistencies, implicit assumptions, and latent bugs. **This skill ONLY adds comments. It MUST NOT make any functional changes, refactors, or 300-line fixes.**

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-annotate-verify cycle, immediately start a new scan from Phase 1. Keep looping until **2 consecutive runs find zero files needing new annotations**. Track the run counter:

```
Run 1 → annotated 85 files → verify → Run 2 → annotated 12 files → verify → Run 3 → found 0 → Run 4 → found 0 → DONE (2 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–4 cycle (inventory, annotate, verify, report)
- A "clean run" means Phase 1 found exactly 0 files needing new annotations across all layers
- The 2-clean-run counter resets to 0 if any files are annotated
- Between runs, print: `### Run N complete — {X files annotated | clean} (consecutive clean: M/2)`
- After 2 consecutive clean runs, print: `### Code Intel complete — 2 consecutive clean runs achieved`

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

1. **API/data layer** (`src/features/*/api.ts`, `src/features/*/hooks.ts`, `src/hooks/`, `admin/src/hooks/`) — annotate these first because they define the data contracts that components depend on
2. **Backend utilities** (`admin/src/lib/`) — sync engine, TMDB client, R2 storage, upload pipeline
3. **Auth layer** (`src/features/auth/`) — providers and auth hooks
4. **Shared components** (`src/components/`) — annotate props contracts and rendering assumptions
5. **Screen components** (`app/`, `admin/src/app/`) — annotate data flow, navigation, and user interaction
6. **Utilities** (`src/utils/`, `src/constants/`) — annotate contracts and edge cases
7. **Stores** (`src/stores/`) — annotate state shape and mutation contracts
8. **Layouts & providers** (`app/_layout.tsx`, `src/providers/`) — provider nesting, route guards

Skip exempt files: `.styles.ts`, `.test.ts`, `.test.tsx`, `__tests__/`, `.d.ts`, `.config.*`, `scripts/`, `.next/`

Use parallel agents to read files across layers simultaneously. **Each agent prompt MUST include this verbatim instruction:**

> "You MUST ONLY add comment lines starting with `//` or `/** */`. You MUST NOT change ANY code — no imports, no function calls, no logic, no guards, no invalidation queries, no tests. If you notice a bug, add an `@edge` or `@nullable: UNGUARDED` comment describing it — do NOT fix it. After finishing, the orchestrator will verify your diff and revert any non-comment changes."

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
- Do NOT add `import` statements — if you're adding an import, you're making a functional change
- Do NOT add `invalidateQueries()`, `useRef()`, `useQueryClient()`, or any React hook calls
- Do NOT add guard logic like `isFirstLoadRef`, `if (isFirstLoad)`, or conditional setters
- Do NOT modify `extraInvalidateKeys`, mutation callbacks, or `onSuccess`/`onError` handlers
- Do NOT add new tests — test files are exempt from this skill entirely

**If you feel tempted to "fix" something you noticed, add an `@edge` or `@nullable: UNGUARDED` comment describing the issue instead. The bug-hunt skill handles fixes.**

**Density guideline**: Aim for 5-15 annotation comments per 100 lines of source code in complex files (API, hooks, screens). Simple utility files may need only 2-5. Don't pad for coverage — only annotate where context genuinely helps.

### Quality Bar — BAD vs GOOD annotations

**The litmus test:** Would a bug-hunting agent learn something from this comment that it couldn't get from reading the code alone? If not, don't add it.

**BAD — restates the code (NEVER write these):**

```ts
// @edge: query must be >= 2 chars to fire
export function useSearchActors(query: string) {
  return useQuery({ enabled: query.length >= 2 });
// ^ A bug-hunter can read `enabled: query.length >= 2`. This comment adds ZERO value.

// @nullable: actor is null until loaded
return { actor: actorQuery.data ?? null };
// ^ Obvious from `?? null`. Worthless.

// @sideeffect: signs in with Google
// ^ Obvious from the function name `signInWithGoogle`.

// @contract: renders input field for authenticated users
// ^ Obvious from the JSX ternary. Don't restate conditionals.
```

**GOOD — provides invisible context (ALWAYS write like these):**

```ts
// @invariant: query key ['actors', 'favorites', userId] must match invalidation in useFavoriteActorMutations — mismatch = stale favorites list forever
// @assumes: userId is a valid UUID from auth context; empty string disables query via `enabled: !!userId` but passing a non-UUID string would return empty results silently (no error)
export function useFavoriteActors(userId: string) {

// @edge: no optimistic update on add/remove — UI won't reflect change until server roundtrip + cache invalidation (~1-2s). Rapid add/remove can show stale state.
// @sideeffect: Alert.alert on error blocks the UI thread — if multiple mutations fail rapidly, alerts stack and must be dismissed one-by-one
const add = useMutation({

// @boundary: idToken comes from Google Sign-In SDK — not validated by our code. Supabase validates server-side. If Google SDK returns a stale/revoked token, signInWithIdToken throws with a generic "invalid_grant" error that we surface as-is to the user.

// @coupling: R2 bucket key format is `{type}/{uuid}/{size}.webp` — if this changes, CDN invalidation in r2-sync.ts AND URL construction in image-resize.ts both break silently
// @invariant: VARIANT_SIZES must include 'original' — upload-handler always generates it, and admin preview reads variants.find(v => v.size === 'original')

// @boundary: TMDB API rate limit is 40 req/10s — sequential fetches avoid this, but bulk operations with >5 movies risk 429 responses that are NOT retried
// @sideeffect: writes to movies, actors, movie_cast, movie_genres without a transaction — partial failure leaves a movie row with no cast/genres, rendering "No cast" in the app

// @coupling: username uniqueness check queries profiles.username directly — if the UNIQUE constraint is ever removed from the table, this check becomes a no-op and duplicate usernames become possible
// @sync: debounced availability check (300ms) can race with form submit — user can submit while a stale "available" result is displayed
```

**Key principles for high-quality annotations:**

1. **Name the blast radius** — don't just say "invalidates cache"; say WHICH query key and what happens if it mismatches
2. **Describe failure modes** — what happens on error? Is it retried? Does it leave orphaned state?
3. **Quantify timing** — don't just say "race condition possible"; say the debounce interval, the staleTime, or the expected latency
4. **Cross-reference files** — name the specific file/function that would break if this code changes
5. **Expose invisible contracts** — RLS policies, DB constraints, TMDB rate limits, R2 key formats — things the code depends on but doesn't encode

### Phase 3 — Verify No Functional Changes (MANDATORY)

This phase is **mandatory** after every batch. Do NOT skip it.

**Step 1 — Detect non-comment changes:**

```bash
# Find files where non-comment lines were changed
git diff --name-only | while IFS= read -r f; do
  has_func=$(git diff -U0 -- "$f" | grep "^[+-]" | grep -v "^[+-][+-][+-]" | grep -v "^[+-]$" | \
    grep -v "^\+\s*\/\/" | grep -v "^\-\s*\/\/" | \
    grep -v "^\+\s*\*" | grep -v "^\-\s*\*" | \
    grep -v "^\+\s*\/\*" | grep -v "^\-\s*\/\*" | \
    grep -v "^\+/\*\*" | grep -v "^\-/\*\*" | \
    grep -v "^\+ *$" | grep -v "^\- *$" | wc -l)
  if [ "$has_func" -gt 0 ]; then echo "FUNCTIONAL CHANGE: $f"; fi
done
```

**Step 2 — Revert any functional changes:**

For every file flagged as `FUNCTIONAL CHANGE`, immediately run `git checkout HEAD -- "file"` to revert it entirely. Then re-annotate it with comments only.

**CRITICAL: Common agent mistakes to watch for (and revert):**

- Adding `import` statements (e.g., `useQueryClient`, `useRef`)
- Adding `invalidateQueries()` calls
- Adding `isFirstLoadRef` or similar guard logic
- Changing function parameters, return values, or conditionals
- Modifying test files or adding new tests
- Changing `extraInvalidateKeys` arrays
- Any line that doesn't start with `//`, `*`, or `/**`

**Step 3 — Type-check:**

```bash
npx tsc --noEmit                    # Mobile
cd admin && npx tsc --noEmit        # Admin
```

Do NOT run full quality gates (ESLint, tests) — comments don't affect those. Only tsc to catch accidental syntax errors.

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
