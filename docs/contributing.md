# Contributing to Faniverz

This guide covers code conventions, quality standards, and workflow for contributing to the Faniverz codebase.

## 300-Line File Limit

Every source file must stay under 300 lines. Check after every change and refactor if needed.

### What Counts

All `.ts` and `.tsx` files under `app/`, `src/`, and `admin/src/`.

### What's Exempt

- Style files (`.styles.ts`) — pure extracted StyleSheet blocks
- Test files (`__tests__/`, `.test.ts`, `.test.tsx`)
- Config files (`.config.ts`, `.config.js`, `jest.setup.js`)
- Type-only files (`.d.ts`)
- Seed/migration scripts (`scripts/`)
- Auto-generated files (`.next/`)

### How to Refactor

**Mobile screens (`app/**/\*.tsx`)\*\*:

1. Extract `StyleSheet.create()` into a `<filename>.styles.ts` file next to it
2. If still over 300, extract sub-components into `app/<route>/components/` (route-specific) or `src/components/<feature>/` (shared)
3. Components import styles from `.styles.ts` files, or receive via props when in `src/components/`

**Admin pages (`admin/src/app/**/\*.tsx`)\*\*:

1. Extract form sections into `admin/src/components/<feature>/`
2. Extract complex state + handlers into hooks under `admin/src/hooks/`

**Hooks over 300 lines**: Split into separate files:

- `*Types.ts` — TypeScript types and interfaces
- `*Handlers.ts` — Event handlers and mutations
- `*Derived.ts` — Computed/derived state
- Main file orchestrates the above

**Critical rules**:

- Never move route files (`app/` or `admin/src/app/`) — extract components OUT of them
- Every extracted component must export a typed props interface
- Every extracted component must have a corresponding test file

## Test Coverage

Target: 100%. Every source file must have a corresponding test file.

### What Must Be Tested

- All components (screens, sub-components, shared UI)
- All custom hooks
- All utility/helper functions
- All API modules

### What's Exempt

- Style files (`.styles.ts`)
- Type-only files (`types.ts`, `.d.ts`)
- Config files, seed scripts, barrel exports (`index.ts` re-exports only)

### What to Test

| File Type   | What to Test                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Components  | Rendering with default/edge-case props, user interactions, conditional rendering, callback invocations, accessibility labels |
| Hooks       | Return values, state transitions, side effects, error states                                                                 |
| Utilities   | All branches, edge cases, error handling                                                                                     |
| API modules | Request construction, response transformation, error mapping                                                                 |

### Test Conventions

**Mobile (Jest)**:

- Framework: Jest 29 + `@testing-library/react-native`
- Mocking: `jest.mock()`
- Mock styles: `jest.mock('<path>.styles', () => ({ styles: new Proxy({}, { get: () => ({}) }) }))`
- Named exports only: `import { Component }` not default imports
- `--forceExit` flag needed in CI due to TanStack Query timer leaks

**Admin (Vitest)**:

- Framework: Vitest 4 + `@testing-library/react`
- Mocking: `vi.mock()`, `vi.fn()`, `vi.spyOn()`
- DOM: jsdom environment
- Assertions: `@testing-library/jest-dom` matchers

## Code Style

### ESLint

Both mobile and admin use ESLint 9 (flat config):

- TypeScript + React plugins
- No unused variables, no console logs

```bash
# Mobile
npx eslint .

# Admin (stricter — zero warnings allowed)
cd admin && npx eslint . --max-warnings 0
```

### Prettier

Formatting is enforced via Prettier with these settings:

- Semicolons: yes
- Single quotes: yes
- Trailing commas: all
- Print width: 100
- Tab width: 2
- Arrow parens: always

### Pre-commit Hooks

Husky + lint-staged runs automatically on `git commit`:

- `.ts` and `.tsx` files: ESLint fix + Prettier format
- `.json` and `.md` files: Prettier format

## TypeScript

Both projects use **strict mode** (`strict: true`).

### Path Aliases

| Alias       | Resolves To                           | Used In |
| ----------- | ------------------------------------- | ------- |
| `@/*`       | `src/*` (mobile) or `./src/*` (admin) | Both    |
| `@shared/*` | `shared/*`                            | Both    |

```typescript
// Use aliases instead of relative paths
import { Movie } from '@/types';
import { colors } from '@shared/colors';
```

## File Organization

### Feature-Based Structure

Code is organized by feature, not by type:

```
src/features/movies/
├── api.ts           # Supabase queries
├── hooks/           # React Query hooks
│   ├── useMovies.ts
│   ├── useMovieDetail.ts
│   └── __tests__/
└── index.ts         # Barrel export
```

### Named Exports

All components use named exports. Never use default exports:

```typescript
// Good
export function MovieCard({ movie }: MovieCardProps) { ... }

// Bad
export default function MovieCard({ movie }: MovieCardProps) { ... }
```

### Style Extraction

When mobile component files exceed 300 lines, extract StyleSheet to a sibling file:

```
app/(tabs)/calendar.tsx           # Screen component
app/(tabs)/calendar.styles.ts     # Extracted StyleSheet
```

## Quality Gates

Run after every change before committing.

### Mobile

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

### Admin

```bash
cd admin && npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

All three must pass. Any failure blocks the change.

## Database Migrations

### Golden Rule

**Never modify an already-applied migration file.** Always create a new migration:

```bash
supabase migration new descriptive_name
```

### Naming

Migrations are numbered sequentially: `20240101000042_my_change.sql`

### Testing Locally

```bash
# Apply all migrations fresh (drops and recreates DB)
supabase db reset

# Check migration status
supabase migration list
```

## Dependency Notes

These version constraints exist due to compatibility issues:

| Dependency            | Constraint            | Reason                                              |
| --------------------- | --------------------- | --------------------------------------------------- |
| Jest                  | v29 (not 30)          | jest-expo incompatible with Jest 30                 |
| ESLint                | v9 (not 10)           | eslint-plugin-react incompatible with ESLint 10     |
| babel-preset-expo     | Must be devDependency | Required by jest-expo for transforms                |
| @types/jest           | Required              | tsc needs it to recognize test globals              |
| react-native-worklets | Required              | Dependency of reanimated v4                         |
| Yarn                  | 1.22.22               | Enforced via `packageManager` field in package.json |

### Installation Issues

If you hit peer dependency conflicts (React 19.1 vs 19.2):

```bash
yarn install --legacy-peer-deps
```

### Jest Mock Notes

- **Reanimated**: Mock manually in `jest.setup.js` — do NOT use `react-native-reanimated/mock`
- **expo-notifications**: `NotificationBehavior` requires both `shouldShowBanner` and `shouldShowList`
- **Admin tsconfig**: Must include `vitest/globals` and `@testing-library/jest-dom` in types array
