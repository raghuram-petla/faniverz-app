# Faniverz Codebase Rules

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
