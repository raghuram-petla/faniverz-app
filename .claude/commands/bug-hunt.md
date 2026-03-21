# Bug Hunt

Deep-scan the entire codebase for runtime bugs, logic errors, performance problems, memory leaks, and wasteful patterns. Unlike gap-audit (which finds incomplete features), this skill finds code that **will break at runtime, behave incorrectly, leak resources, or waste CPU/network cycles**.

## Loop Mode

This skill runs in a **loop until clean**. After completing a full scan-report-fix cycle, immediately start a new scan from Phase 1. Keep looping until **3 consecutive runs find zero bugs**. Track the run counter:

```
Run 1 → found 12 bugs → fix → Run 2 → found 3 bugs → fix → Run 3 → found 0 → Run 4 → found 0 → Run 5 → found 0 → DONE (3 consecutive clean runs)
```

**Rules for loop mode:**

- Each run is a full Phase 1–4 cycle (scan, report, fix all, final report)
- A "clean run" means Phase 1 found exactly 0 bugs across all 14 categories
- The 3-clean-run counter resets to 0 if any bugs are found
- Between runs, print: `### Run N complete — {X bugs found | clean} (consecutive clean: M/3)`
- After 3 consecutive clean runs, print: `### Bug Hunt complete — 3 consecutive clean runs achieved`

## Phase 1 — Scan

Search both mobile (`app/`, `src/`) and admin (`admin/src/`) codebases for each category below. For each finding, record: **file path**, **line number(s)**, **what's wrong**, **severity**, and **how it manifests** (crash, wrong data, silent failure, etc.). Do NOT modify any files during this phase. Use multiple parallel agents for speed.

### Category 1: Null/Undefined Crashes (Critical)

Code that will throw `TypeError: Cannot read properties of undefined/null`:

- **Missing optional chaining**: `obj.nested.value` where `obj.nested` could be `undefined` — should be `obj.nested?.value`
- **Missing nullish coalescing on renders**: `{data.field}` in JSX where `data` could be null/undefined before fetch completes
- **Array method on undefined**: `.map()`, `.filter()`, `.find()`, `.length` on a value that could be `undefined`
- **Destructuring undefined**: `const { a, b } = obj` where `obj` might be `undefined` — should be `const { a, b } = obj ?? {}`
- **Non-null assertions hiding bugs**: `value!` used to silence TypeScript instead of handling the null case
- **Unsafe `.data` access after Supabase call**: Using `data.something` without checking `if (error)` first or without `data?.something`

**Approach**: Grep for `.map(`, `.filter(`, `.find(`, `.length` and trace whether the receiver could be undefined. Grep for `!.` and `! .` (non-null assertions). Read Supabase query callsites and check for unchecked `.data` access.

### Category 2: Async/Promise Bugs (Critical)

Code that silently fails, causes race conditions, or produces unexpected behavior:

- **Missing `await`**: Calling an async function without `await` — the operation fires but errors are swallowed and ordering is wrong
- **Unhandled promise rejection**: `.then()` without `.catch()`, or `async` function in event handler without try/catch
- **Race conditions in `useEffect`**: Async operations in effects without cleanup/abort — stale responses overwrite fresh data
- **Missing abort controller**: Fetch calls in effects without `AbortController` cleanup on unmount
- **Parallel mutations without guards**: Multiple rapid taps on a button triggering duplicate API calls (missing `isPending` / `disabled` guard)
- **`setState` after unmount**: Async callbacks that call `setState` after the component may have unmounted

**Approach**: Grep for `async` inside `useEffect` and check for cleanup returns. Grep for `.mutate(` and `.mutateAsync(` and check if the trigger button uses `isPending` to disable. Grep for `fetch(` without surrounding try/catch.

### Category 3: React Hook Bugs (High)

Violations of React rules that cause stale data, infinite loops, or skipped updates:

- **Missing effect dependencies**: `useEffect(() => { ... }, [])` that references props or state not in the dependency array — causes stale closures
- **Missing callback dependencies**: `useCallback` / `useMemo` with stale dependency arrays
- **Conditional hooks**: `if (condition) { useHook() }` — hooks must be called unconditionally
- **Hooks after early return**: `if (!data) return null; useEffect(...)` — hooks must be called before any return
- **Object/array literals in deps**: `useEffect(..., [{ key: val }])` or `useMemo(..., [[1,2]])` — recreated every render, causing infinite loops
- **Missing cleanup**: `useEffect` that adds event listeners, subscriptions, or intervals without returning a cleanup function

**Approach**: Read component files and trace hook dependency arrays against the variables used inside. Grep for `addEventListener`, `setInterval`, `subscribe` inside effects and check for cleanup returns.

### Category 4: State & Data Flow Bugs (High)

Logic errors that produce wrong data or corrupt state:

- **Direct state mutation**: `state.items.push(x)` or `state.field = x` instead of creating new objects/arrays — React won't re-render
- **Stale closure in event handler**: Event handler references a state variable captured at render time, not current value
- **Wrong comparison**: `==` instead of `===`, or comparing objects/arrays by reference instead of value
- **Type coercion bugs**: `if (count)` when `count` could be `0` (falsy but valid) — should be `if (count !== undefined)`
- **Spread order bugs**: `{ ...defaults, ...overrides }` vs `{ ...overrides, ...defaults }` — wrong order silently overwrites
- **Off-by-one errors**: Array slicing, pagination offset, or index calculations that are off by 1
- **String/number confusion**: Comparing `id === '123'` when `id` is a number, or vice versa — always false

**Approach**: Grep for `.push(`, `.splice(`, direct assignment on state objects. Grep for `==` (loose equality). Read pagination and slicing logic.

### Category 5: Supabase-Specific Bugs (High)

Patterns specific to Supabase that cause data issues:

- **Missing `.single()` or `.maybeSingle()`**: Queries expected to return one row but using default array return — causes `data[0]` access or type mismatches
- **Unchecked `error` on queries**: `const { data } = await supabase.from(...)` without checking `error` — silently uses null data
- **Missing `eq` / `match` on updates/deletes**: UPDATE or DELETE without a WHERE clause — modifies/deletes all rows
- **Wrong RLS assumptions**: Client-side code assuming RLS will filter, but the policy might not exist or might be wrong
- **Upsert without conflict key**: `.upsert()` without `onConflict` — may create duplicates instead of updating
- **Missing `.select()` on insert/update**: Insert or update that should return the new row but missing `.select()` — returns null data
- **Subscription without unsubscribe**: `supabase.channel().subscribe()` without cleanup

**Approach**: Grep for `supabase.from(`, `.insert(`, `.update(`, `.delete(`, `.upsert(` and check for proper error handling, `.single()` usage, and WHERE clauses. Check all realtime subscriptions for cleanup.

### Category 6: Navigation & Routing Bugs (Medium)

Bugs that cause blank screens, wrong screens, or crashes:

- **Wrong route path**: `router.push('/wrong-path')` referencing a route that doesn't exist in `app/`
- **Missing route params**: Navigating to a route that expects params without providing them
- **Params type mismatch**: Route expects `{ id: string }` but receives `{ id: number }`
- **Back navigation from root**: Calling `router.back()` when there's no history — may crash or show blank screen
- **Deep link handling gaps**: Deep links to routes that need auth but don't redirect to login first

**Approach**: Collect all `router.push`, `router.replace`, `router.navigate`, `<Link href=` calls and cross-reference with actual route files in `app/`. Check if params match route expectations.

### Category 7: UI Runtime Bugs (Medium)

Visual bugs that cause layout breaks or bad UX:

- **Image without dimensions**: `<Image source={{ uri }}` without `width` and `height` — may render as 0x0
- **FlatList without `keyExtractor`**: Missing or non-unique keys cause rendering bugs and performance issues
- **TextInput without controlled value**: `<TextInput onChangeText={...}` without `value={...}` — uncontrolled input causes sync bugs
- **ScrollView inside ScrollView**: Nested scrollable views without `nestedScrollEnabled` — causes gesture conflicts
- **Keyboard covering input**: Forms without `KeyboardAvoidingView` or `keyboardShouldPersistTaps="handled"` on ScrollView
- **Flash of wrong theme**: Components reading theme synchronously during mount before theme is resolved

**Approach**: Grep for `<FlatList` without `keyExtractor`, `<Image` without explicit dimensions, `<TextInput` without `value=`, nested `ScrollView`.

### Category 8: Admin-Specific Bugs (Medium)

Bugs specific to the Next.js admin panel:

- **Missing `'use client'` directive**: Components using hooks, state, or browser APIs without the `'use client'` directive
- **Server/client mismatch**: Code that accesses `window`, `document`, or `localStorage` in a server component
- **Missing form validation**: React Hook Form without `required` or validation rules — allows empty submissions
- **Unhandled form errors**: `handleSubmit` without error display — form fails silently
- **Missing `key` on dynamic lists**: `.map()` without a `key` prop
- **Missing loading/error states**: Data fetching without skeleton/spinner/error UI

**Approach**: Check all files using hooks for `'use client'` directive. Grep for `window.`, `document.`, `localStorage` in files without `'use client'`. Read form components for validation rules.

### Category 9: Logic Bugs (High)

Code that runs without crashing but produces **wrong results**:

- **Inverted conditions**: `if (!isLoggedIn)` when it should be `if (isLoggedIn)`, or `&&` vs `||` mixups
- **Wrong boolean logic**: `if (a && b)` when it should be `if (a || b)` — missed edge cases
- **Negation errors**: `!array.includes(x)` when filtering logic is inverted — shows wrong items
- **Wrong variable used**: Copy-paste errors where `itemA` is used where `itemB` was intended (e.g., checking `movie.id` but displaying `actor.id`)
- **Fallthrough logic**: Missing `return` or `break` in if/else chains or switch cases — wrong branch executes
- **Wrong default values**: `?? 0` when the default should be `[]`, or `?? ''` when it should be `null`
- **Wrong sort direction**: `.sort((a, b) => a - b)` when descending was intended, or comparing strings without `.localeCompare()`
- **Date/time bugs**: Timezone-naive comparisons, wrong date format parsing, `new Date()` without timezone consideration
- **Boundary conditions**: `> 0` vs `>= 0`, `< length` vs `<= length` — fencepost errors in loops and conditionals
- **RegExp bugs**: Missing escape characters, greedy matching when lazy needed, missing `g` flag causing only first match

**Approach**: Read business logic functions, filter/sort/search implementations, and conditional rendering logic. Trace data flow to verify conditions match intent. Check all `.sort()`, `.filter()`, date comparisons, and switch statements.

### Category 10: Memory Leaks (High)

Code that holds references longer than needed, causing growing memory usage:

- **Event listeners without removal**: `addEventListener` in `useEffect` without `removeEventListener` in cleanup
- **Intervals/timeouts without clear**: `setInterval` / `setTimeout` without `clearInterval` / `clearTimeout` on unmount
- **Supabase subscriptions without unsubscribe**: `supabase.channel(...).subscribe()` without `.unsubscribe()` in cleanup
- **Large closures in long-lived callbacks**: Event handlers or subscriptions that close over large data structures (full arrays, response objects) — should capture only needed fields
- **Zustand subscriptions without cleanup**: Manual `store.subscribe()` calls (outside React) without unsubscribe
- **Cached data never evicted**: In-memory caches (Maps, objects) that grow unbounded without size limits or TTL
- **Retained component references**: Storing component refs or DOM nodes in module-level variables that outlive the component
- **TanStack Query stale configs**: Queries with `staleTime: Infinity` or `gcTime: Infinity` that accumulate cache entries forever

**Approach**: Grep for `addEventListener`, `setInterval`, `setTimeout`, `.subscribe(`, `new Map()`, `new Set()`, module-level `let`/`const` that get assigned in components. Check all `useEffect` returns for matching cleanup. Check TanStack Query `staleTime` and `gcTime` values.

### Category 11: Performance Bugs (Medium)

Code that causes unnecessary work, slow renders, or janky UI:

- **Expensive computation on every render**: Heavy calculations (sorting, filtering, transforming large arrays) inline in render without `useMemo`
- **Unnecessary re-renders from unstable references**: Passing `{}`, `[]`, or `() => {}` inline as props — creates new reference every render, causing child re-renders
- **Missing `useMemo` on derived data**: Computing filtered/sorted/grouped lists on every render instead of memoizing
- **Missing `useCallback` on handlers passed to children**: Callback props recreated every render, busting `React.memo` on children
- **Large list without virtualization**: Rendering 50+ items with `.map()` in a `ScrollView` instead of `FlatList` / `FlashList`
- **Re-render cascades from context**: Context providers with inline object values `value={{ a, b }}` — every consumer re-renders on any provider render
- **Unnecessary `JSON.stringify` / `JSON.parse`**: Serialization in hot paths (render, scroll handlers, animations)
- **Heavy operations in scroll/gesture handlers**: Non-lightweight callbacks in `onScroll`, `onScrollEndDrag`, or gesture responders
- **Unthrottled search/filter**: Text input triggering API calls or expensive filtering on every keystroke without debounce
- **Image not cached**: Remote images without caching headers or `expo-image` caching — re-downloaded on every mount

**Approach**: Read component render bodies for inline computations on arrays, inline object/function literals in JSX props, `.map()` in `ScrollView`. Grep for `onScroll`, `onChangeText` handlers without debounce. Check image components for caching props.

### Category 12: Unnecessary Computations (Medium)

Work that the CPU does but doesn't need to:

- **Redundant `useMemo` / `useCallback`**: Memoizing cheap operations (single property access, boolean check, string concat) — memoization overhead exceeds computation cost
- **Double transformations**: Data transformed in the API layer AND again in the component — should transform once
- **Re-computing inside `.map()`**: Expensive lookups or calculations inside `.map()` that could be pre-computed in a lookup table before the loop
- **Filtering then counting**: `array.filter(fn).length` when `array.some(fn)` or `array.reduce()` would avoid creating an intermediate array
- **Sorting already-sorted data**: Re-sorting data that comes pre-sorted from the API
- **Stringify for comparison**: `JSON.stringify(a) === JSON.stringify(b)` for deep equality — use shallow comparison or dedicated utility
- **Recomputing constants**: Values that never change being computed inside components instead of at module level
- **Unnecessary spread copies**: `{ ...obj }` or `[...arr]` when the original is never mutated — creates garbage for GC

**Approach**: Read hooks and render functions for memoized trivial computations. Check `.map()` bodies for repeated lookups. Grep for `JSON.stringify` used in comparisons. Look for constants defined inside function bodies.

### Category 13: Unnecessary API Calls (High)

Network requests that waste bandwidth, increase latency, or hit rate limits:

- **Duplicate queries**: Same data fetched by multiple components independently — should share a single TanStack Query key
- **Fetching on every mount**: Data that rarely changes fetched with `staleTime: 0` (default) — should set appropriate `staleTime`
- **Refetching on window focus unnecessarily**: `refetchOnWindowFocus: true` (default) for data that doesn't need real-time freshness
- **Fetching data already available**: Component fetches data that its parent already has and could pass as props
- **Over-fetching columns**: `supabase.from('table').select('*')` when only 2-3 columns are needed — wastes bandwidth
- **Waterfall requests**: Sequential fetches that could be parallel — `await fetchA(); await fetchB();` instead of `Promise.all([fetchA(), fetchB()])`
- **Missing query `enabled` flag**: Queries that fire immediately but depend on data not yet available — should use `enabled: !!dependency`
- **Polling without need**: `refetchInterval` set on queries where data changes rarely or realtime subscriptions would be more efficient
- **Refetching entire list after single mutation**: Invalidating a list query after adding/updating one item — could use optimistic update or patch cache instead
- **Duplicate mutation calls**: Same mutation triggered twice (e.g., double-tap, form resubmission) without `isPending` guard

**Approach**: Collect all TanStack Query `useQuery` keys and check for duplicates across components. Check `staleTime`, `gcTime`, `refetchOnWindowFocus`, `refetchInterval`, `enabled` configs. Grep for `select('*')` in Supabase calls. Look for sequential awaits that could be parallelized. Check mutation triggers for `isPending` guards.

### Category 14: Unnecessary Callbacks & Wrappers (Low)

Code that adds indirection without value:

- **Identity wrapper functions**: `onPress={() => handlePress()}` when `onPress={handlePress}` works — extra closure for no reason
- **Unnecessary arrow in event handlers**: `onChange={(e) => setValue(e)}` when `onChange={setValue}` has the same signature
- **Wrapper hooks that just forward**: Custom hooks that call one other hook and return its result unchanged — remove the indirection
- **Unnecessary async wrappers**: `async () => { return await fn() }` — just `return fn()`, the outer async/await is redundant
- **Pass-through props components**: Components that accept props and pass them all to a single child unchanged — just use the child
- **Callback creating callback**: `useCallback(() => useCallback(...))` or nested memoization that doesn't help
- **Boolean coercion wrappers**: `!!value` or `Boolean(value)` in contexts that already coerce to boolean (`if`, `&&`, ternary)

**Approach**: Grep for `=> {[^}]*\(.*\).*}` patterns (single-call arrow functions). Read custom hooks that are thin wrappers. Look for `!!` in boolean contexts.

## Phase 2 — Report

Present findings as a severity-ranked report:

```
## Bug Hunt Report

### Critical (Will crash / corrupt data)
| # | Category | File:Line | Bug | How It Manifests |
|---|----------|-----------|-----|------------------|

### High (Wrong behavior / silent failure / resource waste)
| # | Category | File:Line | Bug | How It Manifests |
|---|----------|-----------|-----|------------------|

### Medium (Performance / UI breaks / edge cases)
| # | Category | File:Line | Bug | How It Manifests |
|---|----------|-----------|-----|------------------|

### Low (Code hygiene / unnecessary work)
| # | Category | File:Line | Bug | How It Manifests |
|---|----------|-----------|-----|------------------|

### Summary
- Critical: X bugs
- High: Y bugs
- Medium: Z bugs
- Low: W bugs
- Total: N bugs
```

**Do NOT wait for user confirmation.** Proceed directly to Phase 3 and fix ALL bugs across all severity levels.

## Phase 3 — Fix

Fix all bugs in order of severity (Critical first).

### Fix Workflow

1. **Group related fixes** — batch fixes that touch the same files together
2. **Fix the bug** — apply the minimal, correct fix
3. **Write/update tests** — add a test that would have caught this bug (regression test)
4. **Run quality gates** after each severity batch:
   - Mobile: `npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit`
   - Admin: `cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run`
5. **Check 300-line limit** on all modified files
6. **Commit** after each severity batch passes quality gates

### Common Fix Patterns

- **Null crash** → Add optional chaining (`?.`) and nullish coalescing (`?? fallback`)
- **Missing await** → Add `await` keyword, wrap in try/catch if needed
- **Race condition in effect** → Add cleanup with `let cancelled = false` or `AbortController`
- **Missing effect deps** → Add missing deps, or move logic into the dep array if stable
- **Direct state mutation** → Replace with immutable update: `[...arr, item]`, `{ ...obj, key: val }`
- **Unchecked Supabase error** → Add `if (error) throw error` or `if (error) { Alert.alert(...); return; }`
- **Missing `.single()`** → Add `.single()` or `.maybeSingle()` based on whether row must exist
- **Duplicate mutation** → Add `disabled={isPending}` to the trigger button/touchable
- **Missing form validation** → Add validation rules to React Hook Form `register()` or Controller `rules`
- **Missing key** → Add `key={item.id}` or appropriate unique identifier
- **Inverted condition** → Flip the boolean or swap `&&`/`||`
- **Memory leak (listener)** → Add `removeEventListener` / `clearInterval` / `.unsubscribe()` in effect cleanup return
- **Memory leak (query cache)** → Set reasonable `staleTime` and `gcTime` values instead of `Infinity`
- **Unnecessary re-render** → Wrap inline objects/arrays/functions in `useMemo`/`useCallback`, or hoist to module scope if static
- **Missing debounce** → Wrap search/filter handler in `useMemo(() => debounce(fn, 300), [])` or use a debounce hook
- **Over-fetching** → Replace `select('*')` with `select('col1, col2, col3')` listing only needed columns
- **Waterfall fetch** → Replace sequential `await` with `Promise.all([...])` for independent requests
- **Duplicate query** → Ensure components use the same TanStack Query key for the same data; lift shared queries to a custom hook
- **Missing `enabled` flag** → Add `enabled: !!dependency` to queries that depend on async data
- **Unnecessary wrapper** → Replace `() => fn()` with `fn` when signatures match
- **Redundant memoization** → Remove `useMemo`/`useCallback` around trivial operations (property access, boolean checks)
- **Large list without virtualization** → Replace `ScrollView` + `.map()` with `FlatList` or `FlashList`
- **Context re-render cascade** → Memoize context value with `useMemo` or split context into separate providers

## Phase 4 — Final Report

```
## Bug Hunt Fix Summary

### Bugs Fixed
| # | Severity | File(s) | Bug | Fix |
|---|----------|---------|-----|-----|

### Regression Tests Added
| Test File | What It Covers |
|-----------|---------------|

### Quality Gates
- Mobile: PASS/FAIL (X suites, Y tests)
- Admin: PASS/FAIL (X suites, Y tests)
- TSC: 0 errors (both)
- ESLint: 0 errors (both)
- 300-line limit: All files compliant

### Commits
| Hash | Message |
|------|---------|
```

## Rules

- **No new features** — only fix bugs in existing code
- **Minimal fixes** — don't refactor surrounding code or add improvements beyond the bug fix
- **Both codebases** — always check both mobile and admin unless explicitly scoped
- **Regression tests required** — every fix must include a test that reproduces the bug scenario
- **Never modify applied migrations** — create new migration files for DB fixes
- **Mobile mocks**: `jest.mock()`. Admin mocks: `vi.mock()`
- **Admin ESLint**: `--max-warnings 0`. Jest: `--forceExit`
- **Don't conflate with gap-audit** — if something is a missing feature (not wired up), that's a gap, not a bug. Bugs are code that runs but produces wrong results or crashes.
