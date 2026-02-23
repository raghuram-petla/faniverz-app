# Faniverz — Telugu Movie Calendar App: Complete Implementation Plan

## Context

Build **Faniverz**, a cross-platform (iOS + Android) Telugu movie release calendar covering **theatrical** and **OTT (streaming)** releases. Users browse upcoming releases in a calendar view, see when movies land on streaming platforms, track OTT-original movies/series, view detailed movie info with trailers, manage watchlists, write reviews, and receive push notifications. Free app (no ads/payments), architected to expand to other Indian languages later.

---

## Architecture Diagrams

### System Architecture

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                    MOBILE APP  (React Native / Expo)             │
 │                                                                  │
 │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  │
 │  │  Calendar   │  │  Explore   │  │ Watchlist │  │  Profile   │  │
 │  └──────┬─────┘  └─────┬──────┘  └─────┬────┘  └─────┬──────┘  │
 │  ┌──────┴───────────────┴───────────────┴──────────────┴──────┐  │
 │  │              TanStack Query Cache Layer                    │  │
 │  ├────────────────────────────────────────────────────────────┤  │
 │  │  Zustand Stores  │  React Context (Auth)  │  AsyncStorage │  │
 │  └────────┬─────────┴───────────┬────────────┴───────┬───────┘  │
 │  ┌────────┴─────────────────────┴────────────────────┴────────┐  │
 │  │              Supabase JS Client  (supabase-js v2)          │  │
 │  └────────────────────────┬───────────────────────────────────┘  │
 └───────────────────────────┼──────────────────────────────────────┘
                             │ HTTPS / WSS
 ┌───────────────────────────┼──────────────────────────────────────┐
 │  ADMIN PANEL (Next.js)    │                                      │
 │  ┌──────┐ ┌─────┐ ┌────┐ │                                      │
 │  │Movies│ │ OTT │ │Sync│ │                                      │
 │  └──┬───┘ └──┬──┘ └─┬──┘ │                                      │
 │  ┌──┴────────┴──────┴──┐  │                                      │
 │  │  Supabase JS Client │  │                                      │
 │  │  (service role)     │  │                                      │
 │  └─────────┬───────────┘  │                                      │
 └────────────┼──────────────┘                                      │
              │ HTTPS                                               │
          ┌───┴──────────────────────────────────────────┐
          │                  SUPABASE PLATFORM            │
          │  ┌──────────┐  ┌───────────┐  ┌──────────┐  │
          │  │   Auth   │  │  Realtime  │  │ Storage  │  │
          │  └──────────┘  └───────────┘  └──────────┘  │
          │  ┌──────────────────────────────────────────┐│
          │  │          PostgreSQL Database             ││
          │  │  movies | profiles | watchlists          ││
          │  │  reviews | ott_releases | platforms      ││
          │  │  movie_cast | push_tokens                ││
          │  │  notification_queue | admin_audit_log    ││
          │  │  sync_logs                               ││
          │  │  ┌─────────────────────────────────┐    ││
          │  │  │  DB Triggers & pg_cron Jobs     │    ││
          │  │  └─────────────────────────────────┘    ││
          │  └──────────────────────────────────────────┘│
          │  ┌──────────────────────────────────────────┐│
          │  │        Edge Functions (Deno)             ││
          │  │  sync-tmdb-movies | sync-ott-providers   ││
          │  │  send-push-notification | weekly-digest  ││
          │  │  movie-detail-enrichment                ││
          │  └──────────┬──────────────┬───────────────┘│
          └─────────────┼──────────────┼────────────────┘
                        │              │
           ┌────────────┘              └──────────────┐
           ▼                                          ▼
  ┌────────────────────────┐                ┌───────────────────────┐
  │      TMDB  API         │                │   Expo Push API       │
  │  /discover/movie       │                │  → APNs / FCM         │
  │  /movie/{id}/credits   │                │  → User's Device      │
  │  /movie/{id}/watch/    │                └───────────────────────┘
  │        providers       │
  └────────────────────────┘
```

### Data Flow

```
  TMDB API ──► sync-tmdb-movies (CRON daily) ──► movies + movie_cast tables
  TMDB API ──► sync-ott-providers (CRON daily) ──► ott_releases table

  Admin Panel ──► movie/OTT/cast CRUD ──► PostgreSQL ──► admin_audit_log
  Admin Panel ──► "Run Sync Now" ──► Edge Function ──► sync_logs

  Mobile App ──► useQuery() ──► TanStack Query Cache ──► Supabase JS ──► PostgreSQL
                                      ▲ cache hit
                                      └── stale-while-revalidate
```

### Navigation Architecture

```
  app/_layout.tsx (Root: QueryClientProvider > AuthProvider > ThemeProvider)
  │
  ├── (auth)/ [Stack] ─── login | register | forgot-password | otp-verify
  │
  ├── (tabs)/ [Bottom Tabs]
  │   ├── index.tsx ─── CalendarScreen (home)
  │   ├── explore.tsx ─── ExploreScreen
  │   ├── watchlist.tsx ─── WatchlistScreen
  │   └── profile.tsx ─── ProfileScreen
  │
  ├── movie/[id].tsx ─── MovieDetailScreen (pushed from any tab)
  ├── review/[movieId].tsx ─── ReviewsListScreen
  ├── review/write/[movieId].tsx ─── WriteReviewModal (presentation: modal)
  └── settings/ ─── notifications | language | about
```

### Push Notification Flow

```
  User watchlists movie ──► DB trigger ──► notification_queue (T-1 day + T-0)
  OTT release inserted ──► DB trigger ──► notification_queue (immediate)
  Monday CRON ──► weekly-digest Edge Fn ──► notification_queue

  Every 15min CRON ──► send-push-notification Edge Fn
    ──► query due notifications + user push_tokens
    ──► Expo Push API (batch ≤100)
    ──► APNs/FCM ──► device
    ──► notification tap ──► deep link ──► movie/[id]
```

### Database ER Diagram

```
  auth.users ──1:1──► profiles ──1:N──► watchlists ◄──N:1── movies
                           │                                    │
                           ├──1:N──► reviews ◄──────────N:1─────┤
                           ├──1:N──► push_tokens                ├──1:N──► movie_cast
                           ├──1:N──► notification_queue ◄──N:1──┤
                           │                                    ├──1:N──► ott_releases
                           │                                    │              │
                           │                         platforms ──1:N───────────┘
                           │
                           ├──1:N──► admin_audit_log  (Phase 5, is_admin users only)
                           └────────── sync_logs      (Phase 5, standalone table)
```

### State Management

```
  React Context:   AuthContext (session, user, isLoading)
  Zustand:         calendarStore (selectedDate, viewMode)
                   themeStore (mode: light|dark|system) → persisted AsyncStorage
                   filterStore (releaseType, sortBy) → persisted AsyncStorage
  TanStack Query:  ['movies', year, month]     staleTime: 5min
                   ['movie', id]               staleTime: 10min
                   ['ott-releases', movieId]    staleTime: 15min
                   ['watchlist', userId]        staleTime: 0 (always fresh)
                   ['reviews', movieId]         staleTime: 5min
                   ['profile', userId]          staleTime: 30min
                   ['platforms']                staleTime: 24hr
```

### Calendar Screen Component Tree

```
  CalendarScreen
  ├── CalendarHeader (◄ month/year ►)
  ├── CalendarFilter [All | Theatrical | OTT] (segmented control)
  ├── CalendarGrid
  │   └── CalendarDay × 35 (gold dot=theatrical, blue=OTT premiere, purple=OTT original)
  └── DayMovieList (bottom sheet on day tap)
      └── MovieListItem (poster + title + ReleaseTypeBadge + OttBadge)
```

### Movie Detail Screen Component Tree

```
  MovieDetailScreen
  ├── MovieHero (backdrop + poster with shared element transition)
  ├── MovieMeta (title, genres, runtime, certification, release date)
  ├── ReleaseTypeBadge
  ├── WhereToWatchSection
  │   └── WatchOnPlatform × N (platform logo + "Watch Now" deep link)
  ├── SynopsisSection (expandable text)
  ├── CastCarousel (horizontal FlashList)
  ├── TrailerPlayer (YouTube embed)
  ├── ReviewSummary (avg rating + top reviews + "Write Review" CTA)
  ├── WatchlistButton (FAB, bottom-right)
  └── ShareButton (header)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + **Expo SDK 52+** (managed workflow) |
| Routing | **Expo Router v4** (file-based, typed routes) |
| Backend | **Supabase** (PostgreSQL, Auth, Edge Functions, CRON) |
| Movie Data | **TMDB API** (server-side sync) + curated Supabase tables |
| Server State | **TanStack Query v5** |
| Client State | **Zustand v5** |
| Auth State | React Context |
| Testing | **Jest + jest-expo + @testing-library/react-native** |
| Linting | **ESLint flat config** (eslint-config-expo) + **Prettier** |
| Pre-commit | **husky + lint-staged** |
| Push | Expo Notifications + Supabase Edge Functions + Expo Push API |
| i18n | i18next + react-i18next + expo-localization |
| Lists | @shopify/flash-list |
| Images | expo-image |
| Animations | react-native-reanimated |

---

## Quality Gate (enforced on EVERY ticket)

### Mobile App (Phases 1-4)
```bash
npm run lint && npm run typecheck && npm run test
```
- **Lint**: ESLint (flat config) + Prettier — zero warnings, zero errors
- **Typecheck**: `tsc --noEmit` with TypeScript strict mode
- **Test**: Jest with jest-expo — all tests pass, new code has tests
- **Pre-commit hook**: husky + lint-staged runs lint + prettier on staged files

### Admin Panel (Phase 5)
```bash
cd admin && npm run lint && npm run typecheck && npm run test && npm run test:e2e
```
- **Lint**: ESLint + Prettier — zero warnings, zero errors
- **Typecheck**: `tsc --noEmit` with TypeScript strict mode
- **Test**: Vitest — all unit tests pass, new code has tests
- **E2E**: Playwright — all E2E tests pass (final ticket FAN-091)

---

## Project Structure

```
faniverz-app/
├── app/                              # Expo Router file-based routing
│   ├── _layout.tsx                   # Root layout: providers, splash
│   ├── index.tsx                     # Entry redirect
│   ├── (auth)/                       # login, register, forgot-password, otp-verify
│   ├── (tabs)/                       # Calendar, Explore, Watchlist, Profile
│   ├── movie/[id].tsx                # Movie detail
│   ├── review/[movieId].tsx          # Reviews list
│   ├── review/write/[movieId].tsx    # Write review (modal)
│   └── settings/                     # notifications, language, about
├── src/
│   ├── components/
│   │   ├── ui/                       # Button, Card, Input, StarRating, Skeleton
│   │   ├── calendar/                 # CalendarGrid, CalendarHeader, CalendarDay, CalendarFilter, DayMovieList
│   │   ├── movie/                    # MovieCard, MovieHero, CastCarousel, TrailerPlayer, OttBadge, WatchOnPlatform, ReleaseTypeBadge
│   │   ├── review/                   # ReviewCard, ReviewForm, ReviewSummary
│   │   ├── watchlist/                # WatchlistButton
│   │   └── common/                   # EmptyState, ErrorBoundary, LoadingScreen, ShareButton
│   ├── features/
│   │   ├── auth/                     # hooks, providers, utils
│   │   ├── movies/                   # hooks, api, transformers
│   │   ├── ott/                      # useOttReleases, ott api
│   │   ├── watchlist/                # useWatchlist, api
│   │   ├── reviews/                  # useReviews, useMyReview, api
│   │   └── notifications/            # useNotifications, token registration, deep-link, settings
│   ├── stores/                       # useCalendarStore, useThemeStore, useFilterStore
│   ├── lib/                          # supabase.ts, queryClient.ts, constants.ts
│   ├── i18n/                         # en.json, te.json
│   ├── theme/                        # colors.ts, typography.ts, spacing.ts, ThemeProvider.tsx
│   ├── types/                        # movie.ts, user.ts, review.ts, ott.ts, notification.ts, tmdb.ts
│   └── utils/                        # accessibility.ts
├── supabase/
│   ├── migrations/                   # All SQL migrations
│   └── functions/                    # Edge Functions (Deno)
│       ├── _shared/                  # Shared types + utilities (tmdb-types.ts)
│       ├── sync-tmdb-movies/
│       ├── sync-ott-providers/
│       ├── send-push-notification/
│       ├── weekly-digest/
│       └── movie-detail-enrichment/
├── assets/                           # fonts, images, platform logos
├── __tests__/                        # integration & config tests
├── app.json, eas.json, tsconfig.json, babel.config.js
├── eslint.config.js, .prettierrc
├── package.json, .env.example
└── .husky/pre-commit
```

---

## Database Schema

### `profiles` (auto-created via trigger on auth.users INSERT)
`id` UUID PK→auth.users, `display_name`, `avatar_url`, `preferred_lang` DEFAULT 'te', `notify_watchlist` BOOL, `notify_ott` BOOL, `notify_digest` BOOL, `is_admin` BOOL DEFAULT false (added in FAN-069), `created_at`, `updated_at`

### `platforms` (OTT streaming platforms — seeded)
`id` SERIAL PK, `name` UNIQUE, `slug` UNIQUE, `logo_url`, `base_deep_link`, `color` (hex), `display_order`

### `movies` (TMDB + curated)
`id` SERIAL PK, `tmdb_id` INT UNIQUE (nullable for manual OTT originals), `title`, `title_te`, `original_title`, `overview`, `overview_te`, `poster_path`, `backdrop_path`, `release_date` DATE, `runtime`, `genres` TEXT[], `certification`, `vote_average`, `vote_count`, `popularity`, `content_type` ('movie'|'series'), `release_type` ('theatrical'|'ott_original'), `status` ('upcoming'|'released'|'postponed'|'cancelled'), `trailer_youtube_key`, `is_featured` BOOL, `tmdb_last_synced_at`, `created_at`, `updated_at`

### `movie_cast`
`id` SERIAL PK, `movie_id` FK→movies, `tmdb_person_id`, `name`, `name_te`, `character`, `role` ('actor'|'director'|'producer'|'music_director'|...), `profile_path`, `display_order`

### `ott_releases` (when a movie becomes available on each platform)
`id` SERIAL PK, `movie_id` FK→movies, `platform_id` FK→platforms, `ott_release_date` DATE, `deep_link_url`, `is_exclusive` BOOL, `source` ('tmdb'|'manual'), UNIQUE(movie_id, platform_id)

### `watchlists`
`id` SERIAL PK, `user_id` FK→profiles, `movie_id` FK→movies, `created_at` TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, movie_id)

### `reviews` (one per user per movie)
`id` SERIAL PK, `user_id` FK→profiles, `movie_id` FK→movies, `rating` 1-5, `title`, `body`, `is_spoiler` BOOL, `created_at`, `updated_at`, UNIQUE(user_id, movie_id)
- DB trigger: auto-updates `movies.vote_average` and `vote_count` on INSERT/UPDATE/DELETE

### `push_tokens`
`id` SERIAL PK, `user_id` FK→profiles, `expo_push_token`, `device_platform`, `is_active` BOOL, UNIQUE(user_id, expo_push_token)

### `notification_queue`
`id` SERIAL PK, `user_id` FK→profiles, `movie_id` FK→movies (nullable), `type` ('watchlist_reminder'|'release_day'|'ott_available'|'weekly_digest'), `title`, `body`, `data` JSONB, `scheduled_for` TIMESTAMPTZ, `status` ('pending'|'sent'|'failed'|'cancelled'), `sent_at`, `created_at`
- DB trigger on `watchlists` INSERT: schedules T-1 day + T-0 notifications
- DB trigger on `watchlists` DELETE: cancels pending notifications
- DB trigger on `ott_releases` INSERT: notifies watchlisters

### `admin_audit_log` (Phase 5 — admin actions)
`id` SERIAL PK, `admin_user_id` FK→profiles, `action` ('create'|'update'|'delete'|'sync'|'status_change'), `entity_type` ('movie'|'ott_release'|'platform'|'cast'|'notification'), `entity_id` INT, `changes` JSONB (before/after), `ip_address`, `created_at`

### `sync_logs` (Phase 5 — TMDB sync history)
`id` SERIAL PK, `function_name`, `status` ('running'|'success'|'failed'), `movies_added` INT, `movies_updated` INT, `errors` JSONB, `started_at`, `completed_at`

### RLS Summary
- movies, movie_cast, platforms, ott_releases: public read, no user writes (admin write added in FAN-088)
- profiles: public read, self update
- watchlists, reviews, push_tokens: users manage their own
- notification_queue: users read own, system writes via triggers/edge functions (admin read all + update status in FAN-088)
- admin_audit_log: admin read, system write (FAN-088)
- sync_logs: admin read, system write (FAN-088)

---

## Implementation Tickets

### PHASE 1: Foundation (Weeks 1-2)

---

#### FAN-001: Initialize Expo Project
**Deps:** None | **Size:** S
- `npx create-expo-app faniverz-app --template blank-typescript`
- Configure `app.json`: bundle IDs (`com.faniverz.app`), splash, icon, scheme (`faniverz`), `experiments.typedRoutes: true`
- Configure `tsconfig.json`: `extends: "expo/tsconfig.base"`, `strict: true`, path aliases (`@/*` → `src/*`)
- **Files:** `app.json`, `tsconfig.json`, `babel.config.js`, `.gitignore`
- **Tests:** `__tests__/config/tsconfig.test.ts` — validates strict mode enabled, path aliases resolve
- **AC:** Project runs with `npx expo start`, TypeScript strict mode compiles clean

#### FAN-002: Install Core Dependencies
**Deps:** FAN-001 | **Size:** S
- Install: `expo-router`, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-secure-store`, `@tanstack/react-query`, `zustand`, `date-fns`, `react-native-reanimated`, `expo-image`, `expo-image-picker`, `@shopify/flash-list`, `expo-linking`, `expo-haptics`, `expo-sharing`, `expo-font`, `expo-localization`, `expo-splash-screen`, `expo-notifications`, `expo-device`, `i18next`, `react-i18next`, `react-native-youtube-iframe`, `@react-native-community/netinfo`
- **Files:** `package.json`
- **Tests:** `__tests__/config/dependencies.test.ts` — validates all critical deps are installed
- **AC:** `npx expo start` runs without dependency resolution errors

#### FAN-003: ESLint + Prettier + Husky Setup
**Deps:** FAN-002 | **Size:** S
- Install devDeps: `eslint`, `eslint-config-expo`, `eslint-plugin-prettier`, `prettier`, `husky`, `lint-staged`, `@types/jest`, `jest`, `jest-expo`, `@testing-library/react-native`
- Create `eslint.config.js` (flat config with eslint-config-expo + prettier)
- Create `.prettierrc` (semi, singleQuote, tabWidth 2, trailingComma es5, printWidth 100)
- Create `.husky/pre-commit` running `npx lint-staged`
- Add `package.json` scripts: `lint`, `lint:fix`, `typecheck`, `test`, `test:watch`, `prepare`
- Add `lint-staged` config: `*.{ts,tsx}` → `eslint --fix` + `prettier --write`
- **Files:** `eslint.config.js`, `.prettierrc`, `.husky/pre-commit`, `package.json` (scripts + lint-staged)
- **Tests:** `__tests__/config/lint.test.ts` — validates eslint config loads without error
- **AC:** `npm run lint`, `npm run typecheck`, `npm run test` all pass on empty project. Pre-commit hook fires.

#### FAN-004: Project Structure Scaffolding
**Deps:** FAN-003 | **Size:** S
- Create all directories from the project structure (empty `index.ts` barrel exports where needed)
- Create `src/types/movie.ts`, `user.ts`, `review.ts`, `ott.ts`, `notification.ts`, `tmdb.ts` with TypeScript interfaces
- Create `src/lib/constants.ts` with TMDB image base URL, release type enums, platform slugs
- **Files:** All directories + type files + constants
- **Tests:** `src/types/__tests__/types.test.ts` — validates type exports compile, enum values match expectations
- **AC:** All type files compile in strict mode, directory structure matches plan

#### FAN-005: Supabase Project Setup + Migrations
**Deps:** FAN-004 | **Size:** L
- Create Supabase project (via dashboard or CLI)
- Write all migration files:
  - `001_create_profiles.sql` — profiles table + auto-create trigger on auth.users
  - `002_create_platforms.sql` — platforms table + seed data (Aha, Netflix, Prime, Hotstar, Zee5, SunNXT, Sony LIV, ETV Win)
  - `003_create_movies.sql` — movies table with all fields + indexes
  - `004_create_movie_cast.sql` — movie_cast table
  - `005_create_ott_releases.sql` — ott_releases table + unique constraint
  - `006_create_watchlists.sql` — watchlists table + unique constraint
  - `007_create_reviews.sql` — reviews table + unique constraint
  - `008_create_push_tokens.sql` — push_tokens table
  - `009_create_notification_queue.sql` — notification_queue table + indexes
  - `010_create_rls_policies.sql` — all RLS policies
- Configure Supabase Storage buckets:
  - `avatars` bucket (public read, authenticated upload restricted to own user ID prefix)
  - `movie-images` bucket (public read, admin-only upload — admin write policy added in FAN-088)
- Create `.env.example` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Files:** `supabase/config.toml`, `supabase/migrations/001-010_*.sql`, `.env.example`, `.env.local`
- **Tests:** Manual SQL test script — verify tables exist, RLS blocks unauthorized access, trigger creates profile on user signup, storage buckets exist with correct policies
- **AC:** `supabase db push` applies all migrations. All tables created with correct columns, indexes, constraints, and RLS policies. Storage buckets created with correct access policies.

#### FAN-006: Supabase Client + TanStack Query Client
**Deps:** FAN-005 | **Size:** S
- Create `src/lib/supabase.ts` — Supabase client with `expo-secure-store` for auth token persistence
- Create `src/lib/queryClient.ts` — QueryClient with defaults (staleTime 5min, gcTime 30min, retry 2, refetchOnWindowFocus false). Wire `@react-native-community/netinfo` into TanStack Query's `onlineManager` so queries/mutations pause when offline and auto-refetch on reconnect.
- **Files:** `src/lib/supabase.ts`, `src/lib/queryClient.ts`
- **Tests:** `src/lib/__tests__/supabase.test.ts` — client initializes without error, uses correct URL. `src/lib/__tests__/queryClient.test.ts` — default options are set correctly, `onlineManager` is configured with NetInfo listener.
- **AC:** Supabase client connects to project. QueryClient configured with RN-appropriate defaults. Offline state pauses queries, reconnect triggers refetch.

#### FAN-007: Theme System
**Deps:** FAN-006 | **Size:** M
- Create `src/theme/colors.ts` — light and dark color palettes (background, surface, text, primary, secondary, accent, dot colors for theatrical/OTT)
- Create `src/theme/typography.ts` — font families (Inter, Noto Sans Telugu), sizes, weights
- Create `src/theme/spacing.ts` — spacing scale (4, 8, 12, 16, 20, 24, 32, 48)
- Create `src/theme/ThemeProvider.tsx` — React Context providing resolved theme (respects system + manual override). Uses `useColorScheme()` + `useThemeStore`.
- Create `src/stores/useThemeStore.ts` — Zustand with persist middleware (AsyncStorage). State: `mode: 'light'|'dark'|'system'`, `setMode()`.
- **Files:** `src/theme/colors.ts`, `typography.ts`, `spacing.ts`, `ThemeProvider.tsx`, `src/stores/useThemeStore.ts`
- **Tests:** `src/theme/__tests__/ThemeProvider.test.tsx` — renders children, provides correct colors for light/dark. `src/stores/__tests__/useThemeStore.test.ts` — default is 'system', setMode works, persists.
- **AC:** ThemeProvider resolves correct palette. Toggle between light/dark/system works. Persists across app restarts.

#### FAN-008: Auth Provider
**Deps:** FAN-006 | **Size:** M
- Create `src/features/auth/providers/AuthProvider.tsx` — React Context wrapping `supabase.auth.onAuthStateChange`. Provides `session`, `user`, `isLoading`.
- Create `src/features/auth/hooks/useAuth.ts` — hook consuming AuthContext
- **Files:** `src/features/auth/providers/AuthProvider.tsx`, `src/features/auth/hooks/useAuth.ts`
- **Tests:** `src/features/auth/__tests__/AuthProvider.test.tsx` — provides null session when unauthenticated, provides session after sign-in, isLoading starts true then becomes false. `src/features/auth/__tests__/useAuth.test.ts` — throws if used outside provider.
- **AC:** AuthProvider correctly tracks Supabase auth state changes. `useAuth()` returns current session.

#### FAN-009: Root Layout + Splash Screen
**Deps:** FAN-007, FAN-008 | **Size:** M
- Create `app/_layout.tsx` — Root layout wrapping: `QueryClientProvider` > `AuthProvider` > `ThemeProvider`. Uses `SplashScreen.preventAutoHideAsync()`, hides splash when `!isLoading`. Conditional routing: uses Expo Router `<Redirect href>` pattern — if `!session`, redirect to `(auth)/login`; if `session`, redirect to `(tabs)`.
- Create `app/index.tsx` — Redirect to `(tabs)` or `(auth)/login`
- **Files:** `app/_layout.tsx`, `app/index.tsx`
- **Tests:** `app/__tests__/_layout.test.tsx` — renders providers in correct order, shows auth routes when no session, shows tabs when session exists
- **AC:** App boots, shows splash while loading auth state, redirects to login or tabs. Providers are nested correctly.

#### FAN-010: Login Screen (Email/Password)
**Deps:** FAN-009 | **Size:** M
- Create `app/(auth)/_layout.tsx` — Stack navigator for auth screens
- Create `app/(auth)/login.tsx` — Logo, tagline, email input, password input, sign-in button, "Create account" link, social sign-in buttons (disabled initially)
- Create `src/features/auth/hooks/useEmailAuth.ts` — `signInWithEmail(email, password)`, `signUpWithEmail(email, password, displayName)` using Supabase Auth
- **Files:** `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `src/features/auth/hooks/useEmailAuth.ts`
- **Tests:** `app/(auth)/__tests__/login.test.tsx` — renders email/password inputs, calls signIn on submit, shows validation errors for empty fields, navigates to register. `src/features/auth/__tests__/useEmailAuth.test.ts` — calls supabase.auth.signInWithPassword, handles errors.
- **AC:** User can sign in with email/password. Error messages display. Navigation to register works.

#### FAN-011: Register + Forgot Password Screens
**Deps:** FAN-010 | **Size:** M
- Create `app/(auth)/register.tsx` — display name, email, password, confirm password, sign-up button
- Create `app/(auth)/forgot-password.tsx` — email input, send reset link
- **Files:** `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`
- **Tests:** `app/(auth)/__tests__/register.test.tsx` — validates password match, calls signUp. `app/(auth)/__tests__/forgot-password.test.tsx` — calls resetPassword, shows success message.
- **AC:** User can create account, receives confirmation email. Password reset flow works.

#### FAN-012: Google Sign-In
**Deps:** FAN-010 | **Size:** M
- Install `expo-auth-session`, `expo-web-browser`
- Create `src/features/auth/hooks/useGoogleAuth.ts` — OAuth flow via `expo-auth-session` + `supabase.auth.signInWithIdToken`
- Configure Google OAuth in Supabase dashboard
- Wire into login screen
- **Files:** `src/features/auth/hooks/useGoogleAuth.ts`, modify `app/(auth)/login.tsx`
- **Tests:** `src/features/auth/__tests__/useGoogleAuth.test.ts` — mock auth session, verify Supabase signInWithIdToken called
- **AC:** Google sign-in button works on both platforms. User profile created with Google name/avatar.

#### FAN-013: Apple Sign-In
**Deps:** FAN-010 | **Size:** M
- Install `expo-apple-authentication`
- Create `src/features/auth/hooks/useAppleAuth.ts` — Apple auth flow + `supabase.auth.signInWithIdToken`
- Conditionally render Apple button on iOS only
- **Files:** `src/features/auth/hooks/useAppleAuth.ts`, modify `app/(auth)/login.tsx`
- **Tests:** `src/features/auth/__tests__/useAppleAuth.test.ts` — mock AppleAuthentication, verify flow
- **AC:** Apple sign-in works on iOS. Hidden on Android. User profile created.

#### FAN-014: Phone OTP Sign-In
**Deps:** FAN-010 | **Size:** M
- Create `app/(auth)/otp-verify.tsx` — phone number input → OTP input → verify
- Create `src/features/auth/hooks/usePhoneAuth.ts` — `supabase.auth.signInWithOtp({ phone })` + `supabase.auth.verifyOtp()`
- Configure phone provider in Supabase dashboard
- **Files:** `app/(auth)/otp-verify.tsx`, `src/features/auth/hooks/usePhoneAuth.ts`, modify `app/(auth)/login.tsx`
- **Tests:** `app/(auth)/__tests__/otp-verify.test.tsx` — renders phone input, sends OTP, shows OTP input, verifies. `src/features/auth/__tests__/usePhoneAuth.test.ts` — calls correct Supabase methods.
- **AC:** Phone OTP flow works end-to-end. Timer for OTP resend. Error handling for invalid OTP.

#### FAN-015: Tab Navigation Shell
**Deps:** FAN-009 | **Size:** S
- Create `app/(tabs)/_layout.tsx` — Bottom tab navigator with 4 tabs: Calendar (calendar icon), Explore (compass), Watchlist (bookmark), Profile (user)
- Create placeholder screens for each tab
- Create `src/stores/useCalendarStore.ts` — selectedDate, currentMonth, currentYear, viewMode, setSelectedDate, navigateMonth
- Create `src/stores/useFilterStore.ts` — releaseType ('all'|'theatrical'|'ott'), sortBy, setReleaseType, setSortBy — persisted
- **Files:** `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (placeholder), `explore.tsx`, `watchlist.tsx`, `profile.tsx`, `src/stores/useCalendarStore.ts`, `src/stores/useFilterStore.ts`
- **Tests:** `app/(tabs)/__tests__/_layout.test.tsx` — renders 4 tabs with correct labels/icons. `src/stores/__tests__/useCalendarStore.test.ts` — default date is today, navigateMonth changes month. `src/stores/__tests__/useFilterStore.test.ts` — default filter is 'all', persists.
- **AC:** 4-tab navigation works. Tab icons and labels correct. Stores initialize with defaults.

#### FAN-016: TMDB Sync Edge Function
**Deps:** FAN-005 | **Size:** L
- Create `supabase/functions/sync-tmdb-movies/index.ts`:
  1. `GET /discover/movie?with_original_language=te&region=IN&primary_release_date.gte={today-90}&primary_release_date.lte={today+180}&sort_by=primary_release_date.asc`
  2. Paginate through all results
  3. For each movie: `GET /movie/{id}?append_to_response=credits,videos` for cast + trailer
  4. Upsert into `movies` table (preserve curated fields: `title_te`, `overview_te`, `is_featured`)
  5. Upsert into `movie_cast` (top 15 actors + key crew)
  6. Extract YouTube trailer key from videos response
- Create shared TMDB types in `supabase/functions/_shared/tmdb-types.ts`
- Set up CRON: daily at 02:00 IST via `pg_cron`
- **Files:** `supabase/functions/sync-tmdb-movies/index.ts`, `supabase/functions/_shared/tmdb-types.ts`
- **Tests:** `supabase/functions/sync-tmdb-movies/__tests__/index.test.ts` — mock TMDB responses, verify upsert logic, verify curated fields preserved, verify cast extraction
- **AC:** Edge function syncs Telugu movies from TMDB. Initial run populates DB. Curated fields not overwritten. Cast + trailer data extracted. CRON schedule configured.

#### FAN-017: Movies API Layer + Hooks
**Deps:** FAN-006, FAN-016 | **Size:** M
- Create `src/features/movies/api/movies.ts`:
  - `fetchMoviesByMonth(year, month)` — queries `movies` WHERE `release_date` in month AND `status NOT IN ('cancelled')`. Also queries `ott_releases` joined with `movies` WHERE `ott_release_date` in month. Returns combined `CalendarEntry[]` with `date`, `movie`, `dotType` ('theatrical'|'ott_premiere'|'ott_original').
  - `fetchMovieDetail(id)` — fetches movie with cast. After fetch, checks `tmdb_last_synced_at` — if >24h stale, calls `movie-detail-enrichment` edge function in background and invalidates `['movie', id]` query on completion.
  - `fetchMovieCast(movieId)`, `searchMovies(query)` — standard queries, search excludes `status = 'cancelled'`
- Create `src/features/movies/api/tmdb.ts` — image URL helpers: `getPosterUrl(path, size)`, `getBackdropUrl(path, size)`
- Create `src/features/movies/hooks/useMoviesByMonth.ts` — TanStack `useQuery` with key `['movies', year, month]`
- Create `src/features/movies/hooks/useMovieDetail.ts` — `useQuery` with key `['movie', id]`, triggers enrichment when stale
- Create `src/features/movies/hooks/useMovieSearch.ts` — `useQuery` with debounced search
- Create `src/features/movies/utils/transformers.ts` — transform Supabase rows to `CalendarEntry[]`, date grouping helpers, merge theatrical + OTT entries by date
- **Files:** All files above in `src/features/movies/`
- **Tests:** `api.test.ts` — mock Supabase queries, verify correct filters/ordering, verify cancelled movies excluded, verify OTT join returns correct dot types. `hooks.test.ts` — verify query keys, staleTime, data transformation, enrichment trigger on stale data. `transformers.test.ts` — date grouping, image URL construction, theatrical + OTT merge logic.
- **AC:** Hooks fetch movies from Supabase. Calendar hook returns combined theatrical + OTT entries grouped by date with correct dot types. Cancelled movies excluded. Detail hook triggers enrichment when data >24h stale. Search debounces. All properly typed.

#### FAN-018: Calendar Screen
**Deps:** FAN-015, FAN-017 | **Size:** L
- Create `src/components/calendar/CalendarHeader.tsx` — month/year display, prev/next arrows
- Create `src/components/calendar/CalendarDay.tsx` — day number, colored dots (gold=theatrical, blue=OTT premiere, purple=OTT original), selected state, today highlight. Receives `CalendarEntry[]` from `useMoviesByMonth` which already includes both theatrical releases (from `movies.release_date`) and OTT premieres (from `ott_releases.ott_release_date`).
- Create `src/components/calendar/CalendarGrid.tsx` — 7×5 grid layout, generates days for current month, renders CalendarDay components
- Create `src/components/calendar/DayMovieList.tsx` — bottom sheet (or inline) showing movies for selected day, with ReleaseTypeBadge indicating theatrical vs OTT
- Create `src/components/movie/MovieListItem.tsx` — poster thumbnail, title, metadata, release type badge, OTT platform badge when applicable
- Create `src/components/movie/ReleaseTypeBadge.tsx` — colored badge for theatrical/OTT premiere/OTT original
- Wire into `app/(tabs)/index.tsx` — uses `useMoviesByMonth` (returns combined theatrical + OTT entries), `useCalendarStore`, `useFilterStore`
- **Files:** All calendar components + MovieListItem + ReleaseTypeBadge + `app/(tabs)/index.tsx`
- **Tests:** `CalendarHeader.test.tsx` — renders month/year, calls onPrev/onNext. `CalendarDay.test.tsx` — renders day number, shows gold dot for theatrical, blue for OTT premiere, purple for OTT original, multiple dots for same day. `CalendarGrid.test.tsx` — renders 35 cells, correct first day of week. `DayMovieList.test.tsx` — renders list of MovieListItems for selected date, shows both theatrical and OTT entries. `MovieListItem.test.tsx` — renders poster, title, badge.
- **AC:** Monthly calendar displays. Days with theatrical releases show gold dots, OTT premieres show blue dots, OTT originals show purple dots. Multiple dots on same day supported. Tapping day shows movie list. Swipe/arrows change months. Filter toggle works (All/Theatrical/OTT). Cancelled movies not shown.

#### FAN-019: Calendar Filter Toggle
**Deps:** FAN-018 | **Size:** S
- Create `src/components/calendar/CalendarFilter.tsx` — segmented control with 3 options: All, Theatrical, OTT
- Wire into calendar screen, filter dots and DayMovieList based on `filterStore.releaseType`
- **Files:** `src/components/calendar/CalendarFilter.tsx`, modify `app/(tabs)/index.tsx`
- **Tests:** `CalendarFilter.test.tsx` — renders 3 segments, active segment highlighted, calls onFilterChange. Integration: filtering removes non-matching dots.
- **AC:** Filter toggle appears above calendar. Selecting "Theatrical" hides OTT dots. Selecting "OTT" hides theatrical dots. "All" shows both.

#### FAN-020: MovieCard Component
**Deps:** FAN-017 | **Size:** S
- Create `src/components/movie/MovieCard.tsx` — poster image (expo-image), title, release date, genres, rating badge. Tappable → navigates to movie/[id].
- **Files:** `src/components/movie/MovieCard.tsx`
- **Tests:** `MovieCard.test.tsx` — renders poster, title, date, genres. Calls onPress. Handles missing poster (placeholder). Renders in both themes.
- **AC:** Card displays movie info correctly. Placeholder for missing posters. Theme-aware.

#### FAN-021: Explore Screen
**Deps:** FAN-020 | **Size:** M
- Build `app/(tabs)/explore.tsx` with sections: "This Week", "Coming Soon", "Now in Theaters", "Recently Released"
- Each section: horizontal FlashList of MovieCards
- Pull-to-refresh support
- **Files:** `app/(tabs)/explore.tsx`
- **Tests:** `app/(tabs)/__tests__/explore.test.tsx` — renders section headers, renders MovieCards, pull-to-refresh triggers refetch
- **AC:** Explore tab shows categorized movie sections. Horizontal scroll per section. Pull-to-refresh works.

#### FAN-022: Profile Screen + Edit + Theme Toggle
**Deps:** FAN-015, FAN-008, FAN-007 | **Size:** M
- Build `app/(tabs)/profile.tsx` — avatar (tappable to change), display name, email, theme toggle (light/dark/system segmented control using `useThemeStore.setMode()`), sign-out button, links to settings screens (notifications, language, about)
- Create `src/features/auth/hooks/useProfile.ts` — `useProfile(userId)` query hook fetching from `profiles` table (display_name, avatar_url, preferred_lang). Query key `['profile', userId]`, staleTime 30min.
- Create `src/features/auth/hooks/useUpdateProfile.ts` — mutation to update `profiles.display_name` and `profiles.avatar_url`. Avatar upload via `expo-image-picker` + Supabase Storage. Invalidates `['profile', userId]` on success.
- "Edit Profile" button opens inline edit mode: editable display name field + avatar picker
- Theme toggle uses `useThemeStore` from FAN-007 — 3-segment control (Light / Dark / System)
- **Files:** `app/(tabs)/profile.tsx`, `src/features/auth/hooks/useProfile.ts`, `src/features/auth/hooks/useUpdateProfile.ts`
- **Tests:** `app/(tabs)/__tests__/profile.test.tsx` — renders user info from profiles table, sign-out calls auth.signOut, shows settings links, edit mode toggles, profile update mutation called, theme toggle changes mode. `useProfile.test.ts` — correct query key, fetches profiles table. `useUpdateProfile.test.ts` — calls Supabase update, handles avatar upload, invalidates profile query.
- **AC:** Profile shows current user. Display name and avatar editable. Theme toggle works (light/dark/system). Sign out works and redirects to login.

---

### PHASE 2: Movie Details + Watchlist + OTT (Weeks 3-4)

---

#### FAN-023: Movie Detail Screen (Hero + Meta)
**Deps:** FAN-017 | **Size:** M
- Create `app/movie/[id].tsx` — ScrollView with MovieHero + MovieMeta
- Create `src/components/movie/MovieHero.tsx` — full-width backdrop image with gradient overlay, poster overlapping bottom-left
- Create `src/components/movie/MovieMeta.tsx` — title (Telugu + English), genres as chips, runtime, certification, release date, ReleaseTypeBadge
- **Files:** `app/movie/[id].tsx`, `MovieHero.tsx`, `MovieMeta.tsx`
- **Tests:** `movie-[id].test.tsx` — renders hero and meta. `MovieHero.test.tsx` — renders backdrop + poster images. `MovieMeta.test.tsx` — renders title, genres, runtime.
- **AC:** Navigating to movie detail shows hero backdrop, poster, full metadata. Handles missing backdrop gracefully.

#### FAN-024: Cast Carousel + Synopsis
**Deps:** FAN-023 | **Size:** M
- Create `src/components/movie/CastCarousel.tsx` — horizontal FlatList of cast cards (circular photo, name, character/role)
- Add synopsis section to movie detail (expandable text with "Read more")
- **Files:** `CastCarousel.tsx`, modify `app/movie/[id].tsx`
- **Tests:** `CastCarousel.test.tsx` — renders cast members, shows photos, handles missing profile images. Synopsis tests: truncation, expand/collapse.
- **AC:** Cast carousel scrolls horizontally. Photos load with placeholder. Synopsis expands/collapses. Telugu names shown when available.

#### FAN-025: Trailer Player
**Deps:** FAN-023 | **Size:** S
- Create `src/components/movie/TrailerPlayer.tsx` — YouTube thumbnail image with play button overlay. Tapping opens `react-native-youtube-iframe` player or YouTube app.
- **Files:** `TrailerPlayer.tsx`, modify `app/movie/[id].tsx`
- **Tests:** `TrailerPlayer.test.tsx` — renders thumbnail, shows play button, handles missing trailer (hidden section). Opens player on tap.
- **AC:** Trailer section shows YouTube thumbnail. Play button opens embedded player. Hidden when no trailer available.

#### FAN-026: Movie Detail Enrichment Edge Function
**Deps:** FAN-016 | **Size:** M
- Create `supabase/functions/movie-detail-enrichment/index.ts` — HTTP edge function (not CRON). Accepts `movie_id` param. Fetches `GET /movie/{tmdb_id}?append_to_response=credits,videos,watch/providers`, upserts movies + movie_cast + ott_releases. Preserves curated fields (`title_te`, `overview_te`, `is_featured`). Updates `tmdb_last_synced_at` to NOW(). Supports `force=true` param to skip stale check (used by admin in FAN-075).
- Client-side trigger: wired in FAN-017's `useMovieDetail` hook — after fetching movie, if `tmdb_last_synced_at` is >24h old, invokes this edge function in background and invalidates query cache on completion.
- **Files:** `supabase/functions/movie-detail-enrichment/index.ts`
- **Tests:** `__tests__/index.test.ts` — mock TMDB response, verify upsert, verify watch providers parsed, verify curated fields preserved, verify `tmdb_last_synced_at` updated, verify `force` param bypasses stale check
- **AC:** Function refreshes movie data from TMDB on demand. Updates cast, trailer, OTT providers. Preserves curated Telugu fields. Client triggers via FAN-017 hook when data >24h old. Admin triggers via FAN-075 with force=true.

#### FAN-027: OTT Releases API + Hooks
**Deps:** FAN-006 | **Size:** S
- Create `src/features/ott/api.ts` — `fetchOttReleases(movieId)`, `fetchPlatforms()`
- Create `src/features/ott/hooks.ts` — `useOttReleases(movieId)`, `usePlatforms()`
- **Files:** `src/features/ott/api.ts`, `src/features/ott/hooks.ts`
- **Tests:** `api.test.ts` — mock Supabase queries with joins. `hooks.test.ts` — verify query keys, data shape.
- **AC:** Hooks fetch OTT releases with platform details. Data includes platform name, logo, release date, deep link.

#### FAN-028: Where to Watch Section
**Deps:** FAN-023, FAN-027 | **Size:** M
- Create `src/components/movie/OttBadge.tsx` — small platform logo badge
- Create `src/components/movie/WatchOnPlatform.tsx` — platform row: logo + name + release date + "Watch Now" button (deep links via `Linking.openURL`)
- Add "Where to Watch" section to movie detail screen
- **Files:** `OttBadge.tsx`, `WatchOnPlatform.tsx`, modify `app/movie/[id].tsx`
- **Tests:** `OttBadge.test.tsx` — renders logo. `WatchOnPlatform.test.tsx` — renders platform info, "Watch Now" calls Linking.openURL with deep link. Integration: section hidden when no OTT releases.
- **AC:** Movie detail shows OTT platforms where available. Deep links open correct app/website. Section hidden when no OTT data.

#### FAN-029: OTT Sync Edge Function
**Deps:** FAN-005 | **Size:** M
- Create `supabase/functions/sync-ott-providers/index.ts` — CRON daily. For each movie in DB, calls `GET /movie/{tmdb_id}/watch/providers`. Parses `results.IN.flatrate` for subscription platforms. Maps TMDB provider names to `platforms` table. Upserts `ott_releases` with `source='tmdb'`.
- Set up CRON schedule
- **Files:** `supabase/functions/sync-ott-providers/index.ts`
- **Tests:** `__tests__/index.test.ts` — mock TMDB provider response, verify correct platform mapping, verify upsert, verify Indian region parsing
- **AC:** OTT availability data synced from TMDB. Maps to app's platform table. Handles unknown providers gracefully.

#### FAN-030: Explore "New on OTT" Section
**Deps:** FAN-021, FAN-027 | **Size:** S
- Add "New on OTT" section to Explore screen — shows movies recently added to streaming platforms
- Query: `ott_releases` joined with `movies` where `ott_release_date` in last 14 days, ordered by date desc
- **Files:** Modify `app/(tabs)/explore.tsx`
- **Tests:** Section renders with OTT movies. Shows platform badge on each card.
- **AC:** Explore tab includes "New on OTT" section. Shows recent OTT arrivals with platform badges.

#### FAN-031: Watchlist API + Hooks
**Deps:** FAN-006 | **Size:** M
- Create `src/features/watchlist/api.ts` — `fetchWatchlist(userId)`, `addToWatchlist(userId, movieId)`, `removeFromWatchlist(userId, movieId)`, `isInWatchlist(userId, movieId)`
- Create `src/features/watchlist/hooks.ts` — `useWatchlist(userId)` (query), `useWatchlistStatus(movieId)` (is this movie watchlisted?), `useToggleWatchlist()` (mutation with optimistic update)
- **Files:** `src/features/watchlist/api.ts`, `hooks.ts`
- **Tests:** `api.test.ts` — mock CRUD. `hooks.test.ts` — verify optimistic add/remove, cache invalidation, rollback on error.
- **AC:** Watchlist CRUD works. Optimistic updates for instant UI feedback. Rollback on failure.

#### FAN-032: Watchlist Button (FAB)
**Deps:** FAN-031, FAN-023 | **Size:** S
- Create `src/components/watchlist/WatchlistButton.tsx` — floating action button (bottom-right of movie detail). Heart/bookmark icon. Toggle: outline (not saved) → filled (saved). Uses `useToggleWatchlist` mutation.
- Add to movie detail screen
- **Files:** `WatchlistButton.tsx`, modify `app/movie/[id].tsx`
- **Tests:** `WatchlistButton.test.tsx` — renders outline when not watchlisted, filled when watchlisted, calls toggle on press, shows loading state during mutation.
- **AC:** FAB toggles watchlist state. Visual feedback instant (optimistic). Shows on movie detail screen.

#### FAN-033: Watchlist Tab Screen
**Deps:** FAN-031 | **Size:** M
- Build `app/(tabs)/watchlist.tsx` — user's saved movies grouped into sections:
  - "Releasing Soon" (upcoming theatrical, sorted by date asc)
  - "Coming to OTT" (watchlisted movies with upcoming ott_releases)
  - "Already Released" (past release date)
- Swipe-to-remove gesture
- Empty state for new users
- **Files:** `app/(tabs)/watchlist.tsx`
- **Tests:** `app/(tabs)/__tests__/watchlist.test.tsx` — renders grouped sections, swipe removes movie, empty state shown when no items, correct grouping logic.
- **AC:** Watchlist shows grouped movies. Swipe-to-remove works. Empty state for new users. Real-time sync when watchlist changes.

#### FAN-034: Share Button
**Deps:** FAN-023 | **Size:** S
- Create `src/components/common/ShareButton.tsx` — uses React Native `Share.share()` API. Share text: "{title} releases on {date}! Track it on Faniverz"
- Add to movie detail header
- **Files:** `ShareButton.tsx`, modify `app/movie/[id].tsx`
- **Tests:** `ShareButton.test.tsx` — calls Share.share with correct message, handles share cancellation.
- **AC:** Share button in movie detail header. Opens native share sheet with movie info.

#### FAN-035: i18n Setup
**Deps:** FAN-004 | **Size:** M
- Create `src/i18n/index.ts` — i18next setup with `expo-localization` for device locale detection
- Create `src/i18n/en.json` — all English strings (screens, buttons, labels, empty states, errors)
- Create `src/i18n/te.json` — Telugu translations
- Create placeholder `hi.json`, `ta.json` for future expansion
- Apply `t()` calls across all existing screens and components
- **Files:** `src/i18n/index.ts`, `en.json`, `te.json`, `hi.json`, `ta.json`
- **Tests:** `src/i18n/__tests__/i18n.test.ts` — all keys in en.json exist in te.json (no missing translations), i18n initializes with correct defaults, language switching works.
- **AC:** All visible strings use translation keys. Telugu translations complete. Language auto-detected from device. No hardcoded strings.

#### FAN-036: Telugu Fonts
**Deps:** FAN-035 | **Size:** S
- Add Noto Sans Telugu (Regular + Bold) and Inter (Regular + Bold) fonts to `assets/fonts/`
- Load via `expo-font` in root layout
- Apply conditional font family in typography.ts based on current locale
- **Files:** `assets/fonts/*.ttf`, modify `src/theme/typography.ts`, modify `app/_layout.tsx`
- **Tests:** `src/theme/__tests__/typography.test.ts` — correct font family returned for 'te' vs 'en' locale
- **AC:** Telugu text renders with Noto Sans Telugu font. English text renders with Inter. Fonts load before splash hides.

#### FAN-037: Language Picker + About Screen
**Deps:** FAN-035 | **Size:** S
- Create `app/settings/language.tsx` — radio list of available languages (English, Telugu). Updates i18n language + `profiles.preferred_lang` in DB.
- Create `app/settings/about.tsx` — app version, build number, links to privacy policy + terms, credits, "Rate on App Store/Play Store" link
- Create `app/settings/_layout.tsx` — stack navigator for settings
- **Files:** `app/settings/language.tsx`, `app/settings/about.tsx`, `app/settings/_layout.tsx`
- **Tests:** `app/settings/__tests__/language.test.tsx` — renders language options, changing language updates i18n and DB. `about.test.tsx` — renders version, links open correctly.
- **AC:** Language picker shows available languages. Changing language updates all UI text immediately. Persists to DB. About screen shows app info.

#### FAN-038: Search in Explore
**Deps:** FAN-021, FAN-017 | **Size:** M
- Add search bar to Explore screen (top, with debounce)
- `useMovieSearch(query)` — queries `movies` table with `ILIKE` on `title` and `title_te`
- Search results replace section layout with flat search results grid
- Clear search returns to default sections
- **Files:** Modify `app/(tabs)/explore.tsx`, `src/features/movies/hooks/useMovieSearch.ts`
- **Tests:** `useMovieSearch.test.ts` — debounces, queries correct fields, handles empty query. Explore: search mode renders flat list, clear restores sections.
- **AC:** Search bar debounces 300ms. Searches both English and Telugu titles. Empty state for no results. Clear button restores sections.

#### FAN-039: Phase 1+2 Integration Test
**Deps:** All FAN-001 to FAN-038 | **Size:** M
- Write integration tests verifying full flows:
  - Auth: sign in → see tabs → sign out → see login
  - Calendar: navigate months → tap day → see movies → tap movie → see detail
  - Watchlist: add movie → see in watchlist tab → remove → gone
  - Search: type query → see results → tap result → movie detail
- **Files:** `__tests__/integration/auth-flow.test.tsx`, `calendar-flow.test.tsx`, `watchlist-flow.test.tsx`
- **Tests:** All integration tests above
- **AC:** All integration tests pass. Full quality gate: `npm run lint && npm run typecheck && npm run test`

---

### PHASE 3: Reviews + Notifications (Weeks 5-6)

---

#### FAN-040: Review Types + Supabase API
**Deps:** None (Phase 2 done) | **Size:** S
- Create `src/types/review.ts` — `Review`, `ReviewInsert`, `ReviewUpdate`, `ReviewSummary`, `ReviewSortOption`
- Create `src/features/reviews/api.ts` — `fetchReviewsForMovie(movieId, sort, page)`, `fetchMyReview(movieId, userId)`, `insertReview()`, `updateReview()`, `deleteReview()`
- **Tests:** `api.test.ts` — mock Supabase chains, test each CRUD function, test error handling
- **AC:** All review API functions typed and tested.

#### FAN-041: StarRating Component
**Deps:** None | **Size:** S
- Create `src/components/ui/StarRating.tsx` — read-only + interactive modes. Interactive: half-star precision, haptic feedback (expo-haptics). Accessible: `accessibilityRole="adjustable"`.
- **Tests:** `StarRating.test.tsx` — correct filled/half/empty stars, interactive mode fires onRatingChange, read-only ignores press, accessible labels.
- **AC:** Star rating renders correctly. Interactive mode with haptics. Accessible.

#### FAN-042: ReviewCard + ReviewSummary
**Deps:** FAN-040, FAN-041 | **Size:** M
- Create `src/components/review/ReviewCard.tsx` — avatar, star rating, title, body (truncated + "Read more"), spoiler blur, relative timestamp, edit/delete for own review
- Create `src/components/review/ReviewSummary.tsx` — average rating, total count, "Write Review" CTA, "See All" link
- **Tests:** `ReviewCard.test.tsx` — renders all fields, spoiler blur/reveal, own review shows edit/delete. `ReviewSummary.test.tsx` — renders stats, CTA buttons work, "no reviews" state.
- **AC:** ReviewCard handles all states. Spoiler blur works. ReviewSummary shows aggregate data.

#### FAN-043: useReviews + useMyReview Hooks
**Deps:** FAN-040 | **Size:** M
- Create `src/features/reviews/hooks.ts` — `reviewKeys` factory, `useReviews(movieId, sort)` (infinite query), `useMyReview(movieId)`, `useCreateReview()`, `useUpdateReview()`, `useDeleteReview()` mutations with optimistic updates + cache invalidation
- **Tests:** `hooks.test.ts` — pagination works, sort works, mutations invalidate correct keys, optimistic add/update/remove, rollback on error.
- **AC:** Review hooks support infinite scroll, optimistic updates, and cross-query cache invalidation.

#### FAN-044: ReviewForm + Write Review Modal
**Deps:** FAN-041, FAN-043 | **Size:** M
- Create `src/components/review/ReviewForm.tsx` — interactive StarRating, title input (max 100), body textarea (max 2000), spoiler toggle, character count, validation
- Create `app/review/write/[movieId].tsx` — modal route. Pre-populates for edit mode. Uses create/update mutation.
- **Tests:** `ReviewForm.test.tsx` — validation (rating required), submit calls onSubmit, pre-populates for edit. `write-movieId.test.tsx` — create vs edit mode, dismisses on success.
- **AC:** Form validates all fields. Create and edit modes work. Modal dismisses on success.

#### FAN-045: Reviews List Screen
**Deps:** FAN-042, FAN-043, FAN-044 | **Size:** M
- Create `app/review/[movieId].tsx` — ReviewSummary at top, sort selector (Recent/Highest/Lowest), FlashList of ReviewCards with infinite scroll, FAB to write review. Own review pinned at top.
- Create `app/review/_layout.tsx` — stack layout
- **Tests:** `movieId.test.tsx` — renders summary + list, sort changes re-fetch, empty state, own review pinned.
- **AC:** Reviews list with infinite scroll and sorting. Own review pinned. FAB navigates to write modal.

#### FAN-046: Review Aggregation Trigger + Movie Detail Integration
**Deps:** FAN-023, FAN-042, FAN-043 | **Size:** M
- Create `supabase/migrations/011_review_aggregation_trigger.sql` — trigger function auto-updates `movies.vote_average` + `vote_count` on review INSERT/UPDATE/DELETE
- Add ReviewSummary to `app/movie/[id].tsx` — "Write Review" → `review/write/[movieId]`, "See All" → `review/[movieId]`
- **Tests:** SQL test script (trigger math). Integration: movie detail shows ReviewSummary, navigation works.
- **AC:** DB trigger correctly recalculates ratings. Movie detail shows review section with working navigation.

#### FAN-047: Push Token Registration
**Deps:** None | **Size:** M
- Create `src/features/notifications/api.ts` — `registerPushToken()`, `deactivatePushToken()`
- Create `src/features/notifications/hooks.ts` — `useNotifications()` (request permission, get Expo token, register in DB), `useNotificationHandler()` (foreground handler + tap listener)
- Create `supabase/migrations/012_push_tokens_rls.sql` — RLS for push_tokens
- Wire into `app/_layout.tsx` — call hooks when authenticated
- **Tests:** `api.test.ts` — upsert token. `hooks.test.ts` — permission flow, token registration, handler setup.
- **AC:** Push token registered on login. Permission handled gracefully. Foreground notifications show alert.

#### FAN-048: Watchlist Insert Notification Trigger
**Deps:** FAN-047 | **Size:** M
- Create `supabase/migrations/013_watchlist_notification_trigger.sql` — on watchlist INSERT: schedule "releasing tomorrow" (T-1 day 09:00 IST) + "out today" (T-0 08:00 IST) in notification_queue. Only if movie.release_date > today AND user.notify_watchlist = true.
- **Tests:** SQL test: future movie → 2 notifications created. Past movie → 0. notify_watchlist=false → 0.
- **AC:** Watchlist insert correctly schedules future notifications. Respects user preferences and date logic.

#### FAN-049: Watchlist Delete Cancel Trigger
**Deps:** FAN-048 | **Size:** S
- Create `supabase/migrations/014_watchlist_delete_cancel_trigger.sql` — on watchlist DELETE: set `status='cancelled'` on pending notifications for that user+movie
- **Tests:** SQL test: add + remove → notifications cancelled. Already-sent not affected.
- **AC:** Removing from watchlist cancels pending notifications only.

#### FAN-050: OTT Release Notification Trigger
**Deps:** FAN-048 | **Size:** M
- Create `supabase/migrations/015_ott_notification_trigger.sql` — on ott_releases INSERT: find all users who watchlisted this movie AND have notify_ott=true. Insert notification_queue entries of type 'ott_available' scheduled immediately.
- **Tests:** SQL test: 3 users watchlist movie, OTT release added → 3 notifications. User with notify_ott=false → 0.
- **AC:** OTT release creates notifications for all qualifying watchlisters with platform name in title.

#### FAN-051: send-push-notification Edge Function
**Deps:** FAN-048, FAN-049, FAN-050 | **Size:** L
- Create `supabase/functions/send-push-notification/index.ts` — CRON every 15 min:
  1. Query pending notifications where `scheduled_for <= NOW()` (limit 500)
  2. Join with push_tokens (active)
  3. Build Expo push messages, batch ≤100
  4. POST to Expo Push API
  5. Mark sent/failed. Handle DeviceNotRegistered (deactivate token).
- **Files:** Edge function + supporting types/utilities
- **Tests:** `__tests__/index.test.ts` — processes due notifications, skips future, batches correctly, handles errors, deactivates bad tokens.
- **AC:** Notifications delivered via Expo Push API. Handles all error types. Token cleanup on DeviceNotRegistered.

#### FAN-052: Weekly Digest Edge Function
**Deps:** FAN-051 | **Size:** M
- Create `supabase/functions/weekly-digest/index.ts` — CRON Monday 09:00 IST. Queries upcoming week's theatrical + OTT releases. Sends digest to users with notify_digest=true. Skips if no releases.
- **Tests:** `__tests__/index.test.ts` — sends when releases exist, skips empty weeks, includes both theatrical + OTT, respects user preference.
- **AC:** Weekly digest sent every Monday with combined theatrical + OTT summary. Empty weeks skipped.

#### FAN-053: Notification Settings Screen
**Deps:** FAN-047 | **Size:** M
- Create `app/settings/notifications.tsx` — 3 toggles: Theatrical Releases (notify_watchlist), OTT Availability (notify_ott), Weekly Digest (notify_digest). Permission banner if notifications disabled. Dev-only "Test Notification" button.
- Create `src/features/notifications/useNotificationSettings.ts` — query + mutation for preferences
- **Tests:** Renders toggles with correct states. Toggle calls mutation. Permission banner shown when needed.
- **AC:** Three toggles correctly read/write DB preferences. Optimistic updates. Permission banner with system settings link.

#### FAN-054: Deep Linking from Notification Taps
**Deps:** FAN-047, FAN-051 | **Size:** M
- Create `src/features/notifications/deep-link.ts` — `parseNotificationDeepLink(data)` utility with validation + fallback
- Enhance `useNotificationHandler` — warm-start: `addNotificationResponseReceivedListener` → `router.push(deepLink)`. Cold-start: `getLastNotificationResponseAsync()` on mount.
- **Tests:** `deep-link.test.ts` — parses valid links, falls back for malformed/missing. `hooks-deep-link.test.ts` — warm start navigation, cold start navigation.
- **AC:** Tapping notification navigates to correct screen (warm + cold start). Malformed data falls back to home.

#### FAN-055: Phase 3 Integration Tests
**Deps:** All FAN-040 to FAN-054 | **Size:** L
- Integration tests: full review flow (write → edit → delete → verify aggregation), notification flow (register token → watchlist → verify queue → settings toggles), deep link flow
- **Files:** `__tests__/integration/reviews-flow.test.tsx`, `notifications-flow.test.tsx`
- **Tests:** All integration tests described above
- **AC:** All integration tests pass. Full quality gate passes. Phase 3 complete.

---

### PHASE 4: Polish + Launch (Weeks 7-8)

---

#### FAN-056: Loading Skeletons
**Deps:** None | **Size:** M
- Create `src/components/ui/Skeleton.tsx` — base shimmer component (reanimated withRepeat + withTiming). Theme-aware.
- Create `CalendarSkeleton.tsx`, `MovieCardSkeleton.tsx`, `MovieDetailSkeleton.tsx`
- Wire into screens (show skeleton while `isLoading`)
- **Tests:** Renders correct dimensions, theme-aware, skeleton variants match layout.
- **AC:** Smooth shimmer animation. Skeletons match actual component layouts. 60fps.

#### FAN-057: Error Boundaries
**Deps:** None | **Size:** M
- Create `src/components/common/ErrorBoundary.tsx` — class component with `getDerivedStateFromError`
- Create `src/components/common/ErrorFallback.tsx` — error icon, message, "Try Again" + "Go Home" buttons
- Wrap each route group
- **Tests:** Renders children normally, catches errors, retry resets boundary, "Go Home" navigates to tabs.
- **AC:** Unhandled errors show friendly UI instead of crash. Retry and escape hatch work.

#### FAN-058: Empty States
**Deps:** None | **Size:** S
- Create `src/components/common/EmptyState.tsx` — reusable: icon, title, subtitle, optional CTA
- Pre-configured: EMPTY_WATCHLIST, EMPTY_REVIEWS, EMPTY_SEARCH, EMPTY_CALENDAR_DAY
- Wire into all relevant screens
- **Tests:** Renders icon/title/subtitle/CTA. All configs have required fields. i18n keys used.
- **AC:** Every empty list/state has a helpful, themed empty state with CTA where appropriate.

#### FAN-059: Animations
**Deps:** FAN-056 | **Size:** L
- `AnimatedCalendarDay.tsx` — bounce scale on selection (reanimated)
- `AnimatedWatchlistButton.tsx` — bounce + fill animation on toggle + haptic
- `SharedPosterImage.tsx` — shared element transition between MovieCard → MovieDetail (expo-image sharedTransitionTag)
- Respect `accessibilityReduceMotion`
- **Tests:** Components render correctly, animation callbacks fire, reduced motion disables animations.
- **AC:** Smooth animations on UI thread. Haptic feedback on watchlist toggle. Shared element transition between card and detail. Reduced motion respected.

#### FAN-060: FlashList + expo-image Optimization
**Deps:** None | **Size:** M
- Replace all FlatList with FlashList (correct `estimatedItemSize`)
- All images use expo-image with `cachePolicy="memory-disk"`, `contentFit`, `placeholder`, `recyclingKey`
- **Tests:** Components use FlashList (not FlatList). Images use expo-image with required props.
- **AC:** All lists use FlashList. All images cached with placeholders. Smooth scrolling at 60fps.

#### FAN-061: Memoization
**Deps:** FAN-060 | **Size:** M
- `React.memo` on all list item components (MovieCard, CalendarDay, ReviewCard, CastCard)
- `useMemo` for expensive computations (date grouping, filtering, section data)
- `useCallback` for event handlers passed as props
- Custom `areEqual` comparison on CalendarDay
- **Tests:** Components don't re-render with same props. CalendarDay custom comparison works.
- **AC:** No unnecessary re-renders. Verified with profiler. All existing tests still pass.

#### FAN-062: Accessibility Compliance
**Deps:** FAN-059 | **Size:** L
- Add `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `accessibilityHint` to all interactive elements
- Minimum 44×44pt tap targets
- Verify WCAG AA color contrast (4.5:1 normal, 3:1 large)
- Create `src/utils/accessibility.ts` — helper functions for generating a11y labels
- **Tests:** `accessibility.test.ts` — label generators return correct strings. Component tests verify a11y props.
- **AC:** All interactive elements labeled. Tap targets ≥44pt. Contrast ratios verified. VoiceOver/TalkBack testing documented.

#### FAN-063: EAS Build Configuration
**Deps:** None | **Size:** M
- Create `eas.json` — development (simulator), preview (internal), production (store) profiles with per-profile env vars
- Configure EAS Update for OTA
- Add build/update scripts to package.json
- **Tests:** `__tests__/config/eas-config.test.ts` — validates profile fields, env isolation.
- **AC:** All three build profiles work. EAS Update configured. Env vars isolated per profile.

#### FAN-064: App Store Assets
**Deps:** FAN-063 | **Size:** M
- App icon (1024×1024), screenshots for iOS + Android sizes, feature graphic (Android)
- Store metadata in English + Telugu (descriptions, keywords)
- Privacy policy
- **Tests:** `__tests__/config/store-metadata.test.ts` — all fields present, within character limits.
- **AC:** All store assets created. Descriptions in both languages. Privacy policy complete.

#### FAN-065: Production Supabase Hardening
**Deps:** FAN-046, FAN-048-050 | **Size:** L
- Create `supabase/migrations/016_rls_hardening.sql` — comprehensive RLS audit, FORCE ROW LEVEL SECURITY, verify all policies
- Create `supabase/migrations/017_indexes.sql` — composite indexes for common queries
- Security checklist: no service role key in client, all tables have RLS, rate limiting on edge functions
- **Tests:** RLS test scripts (cross-user access denied), client config test (no secret keys in client code).
- **AC:** All tables hardened with FORCE RLS. Indexes optimized. Security audit documented. No client-side secrets.

#### FAN-066: End-to-End QA
**Deps:** All previous | **Size:** XL
- Create `docs/qa-test-plan.md` — comprehensive test plan covering all features, edge cases, platforms
- Execute on iOS + Android (physical devices or emulators)
- Document results in `docs/qa-results.md`
- Fix all critical/high bugs
- **Files:** `docs/qa-test-plan.md`, `docs/qa-results.md`, `__tests__/smoke.test.tsx`
- **Tests:** `__tests__/smoke.test.tsx` — app renders, providers mount, tabs render. Manual QA per test plan.
- **AC:** QA plan executed on both platforms. No critical bugs. App launch <3s. Scroll ≥55fps. Accessibility checks pass.

#### FAN-067: App Store + Google Play Submission
**Deps:** FAN-063, FAN-064, FAN-065, FAN-066 | **Size:** L
- `eas build --profile production --platform all`
- `eas submit --platform ios` + `eas submit --platform android`
- Complete store listings, content ratings, privacy details, data safety
- **Tests:** `__tests__/config/production-readiness.test.ts` — valid bundle IDs, version set, no __DEV__ leaks.
- **AC:** Production builds compile. Both stores accept submission. All metadata complete.

---

### PHASE 5: Admin Panel (Weeks 9-12)

> **Prerequisite:** All mobile app phases (FAN-001 to FAN-067) must be complete before starting Phase 5. The admin panel is a separate **Next.js web application** that shares the same Supabase backend.

---

#### Admin Panel Architecture

```
  ┌───────────────────────────────────────────────────────────────┐
  │              ADMIN PANEL  (Next.js App Router)                │
  │                                                               │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
  │  │Dashboard  │  │ Movies   │  │ OTT Mgmt │  │Notifications│  │
  │  └─────┬────┘  └─────┬────┘  └─────┬────┘  └──────┬──────┘  │
  │  ┌─────┴──────────────┴────────────┴───────────────┴───────┐  │
  │  │         TanStack Query + Supabase JS Client             │  │
  │  └────────────────────────┬────────────────────────────────┘  │
  └───────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
           ┌──────────────────┼───────────────────────────┐
           │                  ▼   SUPABASE (shared)       │
           │  ┌──────────┐  ┌──────────────────────────┐  │
           │  │   Auth   │  │  PostgreSQL (same DB)    │  │
           │  │(is_admin)│  │  + admin_audit_log table │  │
           │  └──────────┘  └──────────────────────────┘  │
           └──────────────────────────────────────────────┘
```

#### Admin Panel Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15** (App Router) |
| UI | **Tailwind CSS v4** + **shadcn/ui** |
| State | **TanStack Query v5** + **Supabase JS** |
| Auth | Supabase Auth + `is_admin` role gate |
| Forms | **React Hook Form** + **Zod** validation |
| Tables | **TanStack Table v8** (sorting, filtering, pagination) |
| Charts | **Recharts** |
| Testing | **Vitest** + **Playwright** (E2E) |
| Deployment | **Vercel** |

#### Admin Panel Project Structure

```
admin/
├── app/
│   ├── layout.tsx              # Root: QueryClientProvider + AuthGate
│   ├── login/page.tsx          # Admin login
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + header shell
│   │   ├── page.tsx            # Dashboard analytics
│   │   ├── movies/
│   │   │   ├── page.tsx        # Movie list (table)
│   │   │   ├── [id]/page.tsx   # Movie edit form
│   │   │   └── new/page.tsx    # Add manual movie
│   │   ├── ott/
│   │   │   ├── page.tsx        # OTT releases list
│   │   │   └── [id]/page.tsx   # OTT release edit
│   │   ├── platforms/page.tsx  # Platform management
│   │   ├── cast/
│   │   │   ├── page.tsx        # Cast list
│   │   │   └── [id]/page.tsx   # Cast edit (Telugu names)
│   │   ├── notifications/
│   │   │   ├── page.tsx        # Notification queue viewer
│   │   │   └── compose/page.tsx # Compose notification
│   │   ├── sync/page.tsx       # TMDB sync logs + manual trigger
│   │   └── audit/page.tsx      # Audit log viewer
│   └── api/                    # Next.js API routes (if needed)
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── data-table/         # Reusable data table with sorting/filtering/pagination
│   │   ├── forms/              # MovieForm, OttReleaseForm, PlatformForm, CastForm
│   │   └── layout/             # Sidebar, Header, Breadcrumbs
│   ├── lib/
│   │   ├── supabase-admin.ts   # Supabase client (service role for admin ops)
│   │   ├── supabase-browser.ts # Supabase client (browser, anon key + auth)
│   │   └── utils.ts            # cn(), formatters
│   ├── hooks/                  # useMovies, useOttReleases, usePlatforms, etc.
│   └── types/                  # Shared types (can reference mobile app types)
├── e2e/                        # Playwright tests
├── tailwind.config.ts, tsconfig.json, next.config.ts
├── package.json, vitest.config.ts
└── .env.local
```

---

#### FAN-068: Admin Next.js Project Scaffolding
**Deps:** FAN-067 (all mobile phases complete) | **Size:** M
- `npx create-next-app admin --typescript --tailwind --app --src-dir`
- Install: `@supabase/supabase-js`, `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`, `recharts`, `lucide-react`
- Install shadcn/ui: `npx shadcn@latest init` + add components: Button, Input, Select, Dialog, Table, Card, Badge, Tabs, Dropdown Menu, Toast, Sheet, Skeleton, Switch, Textarea, Label, Separator, Command, Popover, Calendar
- Configure `tsconfig.json` (strict mode, path aliases `@/*` → `src/*`)
- Configure ESLint + Prettier (matching mobile app config style)
- Add scripts: `lint`, `typecheck`, `test`, `test:e2e`
- Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Files:** `admin/` directory with all config files
- **Tests:** `src/__tests__/config.test.ts` — validates strict mode, dependencies installed, env vars configured
- **AC:** `npm run dev` starts admin app. TypeScript strict mode. Lint + typecheck pass.

#### FAN-069: Admin Auth + Role Gate
**Deps:** FAN-068 | **Size:** M
- Create `supabase/migrations/018_admin_role.sql` — add `is_admin BOOLEAN DEFAULT false` column to `profiles` table. Create RLS policy: only admins can access admin-specific operations.
- Create `admin/app/login/page.tsx` — email/password login form (admins use same Supabase Auth, gated by `is_admin`)
- Create `admin/src/lib/supabase-browser.ts` — Supabase browser client
- Create `admin/src/lib/supabase-admin.ts` — Supabase service-role client (server-side only, never exposed to browser)
- Create `admin/src/hooks/useAdminAuth.ts` — auth hook that checks `is_admin` flag, redirects non-admins to "Access Denied" page
- Create `admin/app/layout.tsx` — root layout with QueryClientProvider + auth state check
- **Files:** Migration, login page, Supabase clients, auth hook, root layout
- **Tests:** `useAdminAuth.test.ts` — redirects non-admin users, allows admin users. `login.test.tsx` — form validation, error display, successful login flow.
- **AC:** Admin login works. Non-admin users see "Access Denied". Service role key only used server-side.

#### FAN-070: Admin Shell Layout (Sidebar + Header)
**Deps:** FAN-069 | **Size:** M
- Create `admin/app/(dashboard)/layout.tsx` — sidebar + main content area
- Create `admin/src/components/layout/Sidebar.tsx` — navigation links: Dashboard, Movies, OTT Releases, Platforms, Cast & Crew, Notifications, Sync Logs, Audit Log. Collapsible. Active state highlighting.
- Create `admin/src/components/layout/Header.tsx` — breadcrumbs, admin user avatar, sign-out button
- Create `admin/src/components/layout/Breadcrumbs.tsx` — auto-generated from route segments
- **Files:** Layout, Sidebar, Header, Breadcrumbs
- **Tests:** `Sidebar.test.tsx` — renders all nav links, active state. `Header.test.tsx` — renders breadcrumbs, sign-out works. `layout.test.tsx` — renders sidebar + main area.
- **AC:** Dashboard shell with working sidebar navigation. Breadcrumbs update per route. Responsive (collapsible sidebar on mobile).

#### FAN-071: Reusable Data Table Component
**Deps:** FAN-068 | **Size:** M
- Create `admin/src/components/data-table/DataTable.tsx` — generic wrapper around TanStack Table v8. Features: column sorting, text filtering, column visibility toggle, pagination (page size selector), row selection, bulk actions toolbar, loading skeleton.
- Create `admin/src/components/data-table/DataTablePagination.tsx`
- Create `admin/src/components/data-table/DataTableToolbar.tsx`
- Create `admin/src/components/data-table/DataTableColumnHeader.tsx`
- **Files:** All data-table components
- **Tests:** `DataTable.test.tsx` — renders columns/rows, sorting changes order, filtering works, pagination controls, row selection, loading state.
- **AC:** Fully reusable data table. Sorting, filtering, pagination all work. Used across all admin list views.

#### FAN-072: Movie List Page
**Deps:** FAN-070, FAN-071 | **Size:** M
- Create `admin/app/(dashboard)/movies/page.tsx` — data table of all movies with columns: poster thumbnail, title, title_te, release_date, release_type, status, is_featured, vote_average, tmdb_last_synced_at
- Filters: release_type dropdown, status dropdown, date range picker, search
- Row actions: Edit, Re-sync from TMDB, Toggle featured, Change status
- Bulk actions: Set status, Toggle featured
- Create `admin/src/hooks/useAdminMovies.ts` — query + mutations for movie CRUD
- **Files:** Movie list page, hooks
- **Tests:** `movies-page.test.tsx` — renders table, filters work, row actions trigger mutations. `useAdminMovies.test.ts` — correct queries, mutations invalidate cache.
- **AC:** Movie list with all columns, filters, sorting, pagination. Row actions work. Bulk actions work.

#### FAN-073: Movie Edit Page
**Deps:** FAN-072 | **Size:** L
- Create `admin/app/(dashboard)/movies/[id]/page.tsx` — edit form for existing movie
- Create `admin/src/components/forms/MovieForm.tsx` — React Hook Form + Zod schema. Fields: title, title_te, overview, overview_te, release_date (date picker), runtime, genres (multi-select), certification, release_type (select), status (select), trailer_youtube_key, is_featured (switch). Poster + backdrop preview. Read-only TMDB fields shown for reference.
- **Files:** Movie edit page, MovieForm component, Zod schema
- **Tests:** `MovieForm.test.tsx` — validation (required fields), submit sends correct data, pre-populates for edit, genre multi-select works. `movie-edit.test.tsx` — loads movie data, saves changes, shows success toast.
- **AC:** Movie edit form with full validation. Telugu fields editable. TMDB fields shown as reference. Save persists to DB.

#### FAN-074: Add Manual Movie Page
**Deps:** FAN-073 | **Size:** S
- Create `admin/app/(dashboard)/movies/new/page.tsx` — reuses MovieForm in create mode. For OTT originals or movies not in TMDB.
- Manual image upload for poster/backdrop via Supabase Storage
- **Files:** New movie page, modify MovieForm for create mode
- **Tests:** `movie-new.test.tsx` — form starts empty, validation enforced, image upload works, creates movie in DB.
- **AC:** Admin can add movies not in TMDB. Image upload to Supabase Storage. All fields validated.

#### FAN-075: TMDB Re-sync Action
**Deps:** FAN-072 | **Size:** S
- Add "Re-sync from TMDB" button to movie list (row action) and movie edit page
- Calls `movie-detail-enrichment` edge function (FAN-026) with `force=true` flag
- Shows loading state, success/error toast
- Preserves curated fields (title_te, overview_te, is_featured, manually set status)
- **Files:** Modify movie list + edit pages, add re-sync API call
- **Tests:** `resync.test.ts` — calls edge function, preserves curated fields, handles errors.
- **AC:** Re-sync refreshes TMDB data while preserving curated Telugu translations. Loading + success/error feedback.

#### FAN-076: OTT Release List Page
**Deps:** FAN-071 | **Size:** M
- Create `admin/app/(dashboard)/ott/page.tsx` — data table of OTT releases with columns: movie title, platform logo+name, ott_release_date, is_exclusive, source (tmdb/manual), deep_link_url
- Filters: platform dropdown, source dropdown, date range
- Row actions: Edit, Delete
- "Add OTT Release" button
- Create `admin/src/hooks/useAdminOtt.ts` — query + mutations
- **Files:** OTT list page, hooks
- **Tests:** `ott-page.test.tsx` — renders table with joins, filters, row actions. `useAdminOtt.test.ts` — CRUD operations.
- **AC:** OTT release list shows all data with platform info. Filters work. CRUD operations work.

#### FAN-077: OTT Release Add/Edit Page
**Deps:** FAN-076 | **Size:** M
- Create `admin/app/(dashboard)/ott/[id]/page.tsx` — edit form (also handles create via `new` param)
- Create `admin/src/components/forms/OttReleaseForm.tsx` — React Hook Form + Zod. Fields: movie (searchable combobox), platform (select), ott_release_date (date picker), deep_link_url, is_exclusive (switch). Movie combobox searches by title/title_te.
- **Files:** OTT edit page, OttReleaseForm, Zod schema
- **Tests:** `OttReleaseForm.test.tsx` — movie search combobox works, validation, duplicate check (movie+platform unique). `ott-edit.test.tsx` — create + edit modes.
- **AC:** OTT release form with movie search combobox. Validates unique movie+platform combination. Create and edit modes.

#### FAN-078: Platform Management Page
**Deps:** FAN-071 | **Size:** M
- Create `admin/app/(dashboard)/platforms/page.tsx` — table of streaming platforms + inline edit + drag-and-drop reorder for `display_order`
- Fields: name, slug, logo_url (upload), base_deep_link, color (color picker), display_order
- Add/edit via dialog (not separate page since few fields)
- Create `admin/src/hooks/useAdminPlatforms.ts`
- **Files:** Platforms page, hooks
- **Tests:** `platforms-page.test.tsx` — renders table, add dialog, edit inline, drag-reorder updates display_order. `useAdminPlatforms.test.ts` — CRUD + reorder mutation.
- **AC:** Platform CRUD with logo upload. Drag-and-drop reorder persists. Color picker for brand color.

#### FAN-079: Cast & Crew List Page
**Deps:** FAN-071 | **Size:** M
- Create `admin/app/(dashboard)/cast/page.tsx` — data table of cast/crew with columns: profile photo, name, name_te, role types (actor/director/etc.), movie count
- Filters: role dropdown, search by name/name_te
- Row action: Edit
- Create `admin/src/hooks/useAdminCast.ts` — query grouped by tmdb_person_id
- **Files:** Cast list page, hooks
- **Tests:** `cast-page.test.tsx` — renders table, search works, filter by role. `useAdminCast.test.ts` — aggregation query.
- **AC:** Cast list grouped by person (not duplicated per movie). Search across English + Telugu names. Role filter works.

#### FAN-080: Cast Edit Page (Telugu Names)
**Deps:** FAN-079 | **Size:** S
- Create `admin/app/(dashboard)/cast/[id]/page.tsx` — edit form for a cast member across all their movies
- Create `admin/src/components/forms/CastForm.tsx` — fields: name (read-only from TMDB), name_te (editable), profile_path. Shows list of associated movies (read-only).
- **Files:** Cast edit page, CastForm
- **Tests:** `CastForm.test.tsx` — name_te editable, TMDB name read-only, movie list shown. `cast-edit.test.tsx` — loads person data, saves Telugu name across all movie_cast rows.
- **AC:** Admin can add/edit Telugu names for cast. Update propagates to all movie_cast rows for that person.

#### FAN-081: Cast-Movie Assignment
**Deps:** FAN-080 | **Size:** S
- Add "Manage Cast" tab/section to movie edit page (FAN-073)
- Shows movie's current cast list (sortable by display_order)
- Add cast member: search by name → select → assign role + character + display_order
- Remove cast member from movie
- Drag-and-drop reorder for display_order
- **Files:** Modify movie edit page, add CastAssignment component
- **Tests:** `CastAssignment.test.tsx` — search + add, remove, reorder, role selection.
- **AC:** Admin can manage cast per movie. Search, add, remove, reorder all work. display_order persists.

#### FAN-082: Dashboard Analytics Page
**Deps:** FAN-070 | **Size:** L
- Create `admin/app/(dashboard)/page.tsx` — analytics dashboard with:
  - Summary cards: total movies, upcoming releases (next 30 days), total users, total reviews, active watchlist items
  - Chart: releases by month (bar chart, theatrical vs OTT)
  - Chart: user signups over time (line chart)
  - Chart: top 10 watchlisted movies (horizontal bar)
  - Recent activity feed: latest reviews, watchlist adds, new users
  - Quick actions: "Add Movie", "Add OTT Release", "Trigger TMDB Sync"
- Create `admin/src/hooks/useDashboardStats.ts` — aggregation queries
- **Files:** Dashboard page, stats hooks
- **Tests:** `dashboard.test.tsx` — renders all cards with correct data, charts render, activity feed shows items. `useDashboardStats.test.ts` — aggregation queries return correct shape.
- **AC:** Dashboard shows real-time stats. Charts render correctly. Quick actions navigate to correct pages.

#### FAN-083: TMDB Sync Logs + Manual Trigger
**Deps:** FAN-070 | **Size:** M
- Create `admin/app/(dashboard)/sync/page.tsx` — shows sync history (last 30 runs), status (success/failed/running), movies added/updated per run, errors
- "Run Sync Now" button: invokes `sync-tmdb-movies` edge function manually
- "Sync OTT Providers" button: invokes `sync-ott-providers` edge function manually
- Create `supabase/migrations/019_sync_log_table.sql` — `sync_logs` table: id, function_name, status, movies_added, movies_updated, errors JSONB, started_at, completed_at
- Modify sync edge functions (FAN-016, FAN-029) to write to `sync_logs` table
- **Files:** Sync page, migration, modify edge functions
- **Tests:** `sync-page.test.tsx` — renders log table, manual trigger calls edge function, loading state during sync. Migration test: table created correctly.
- **AC:** Sync history visible. Manual trigger works with real-time status. Errors displayed for debugging.

#### FAN-084: Notification Queue Viewer
**Deps:** FAN-071 | **Size:** M
- Create `admin/app/(dashboard)/notifications/page.tsx` — data table of notification_queue with columns: user (display_name), movie title, type, title, status, scheduled_for, sent_at
- Filters: status dropdown, type dropdown, date range
- Row actions: Cancel (set pending→cancelled), Retry (set failed→pending)
- Stats summary: pending count, sent today, failed today
- Create `admin/src/hooks/useAdminNotifications.ts`
- **Files:** Notifications page, hooks
- **Tests:** `notifications-page.test.tsx` — renders queue, cancel action, retry action, stats cards. `useAdminNotifications.test.ts` — queries with filters, mutations.
- **AC:** Notification queue fully viewable. Cancel/retry actions work. Stats accurate.

#### FAN-085: Compose Notification Page
**Deps:** FAN-084 | **Size:** M
- Create `admin/app/(dashboard)/notifications/compose/page.tsx` — compose and send ad-hoc push notifications
- Create `admin/src/components/forms/NotificationForm.tsx` — fields: title, body, target (all users / users with notify_digest / specific movie's watchlisters), scheduled_for (immediate or future date/time), data (movie deep link)
- Preview section showing how notification will appear
- **Files:** Compose page, NotificationForm
- **Tests:** `NotificationForm.test.tsx` — validation, target options, schedule picker, preview renders. `compose.test.tsx` — submits to notification_queue correctly.
- **AC:** Admin can compose custom notifications. Target specific audiences. Schedule for future. Preview before sending.

#### FAN-086: Notification Retry + Bulk Actions
**Deps:** FAN-084 | **Size:** S
- Add bulk actions to notification queue: "Retry All Failed", "Cancel All Pending" (with confirmation dialog)
- Add "Failed Notifications" quick filter tab
- Show error details for failed notifications in expandable row
- **Files:** Modify notifications page
- **Tests:** Bulk retry, bulk cancel, error detail expansion, confirmation dialog.
- **AC:** Bulk retry/cancel work with confirmation. Error details visible for debugging.

#### FAN-087: Audit Logging
**Deps:** FAN-069 | **Size:** M
- Create `supabase/migrations/020_audit_log.sql` — `admin_audit_log` table: id, admin_user_id FK→profiles, action ('create'|'update'|'delete'|'sync'|'status_change'), entity_type ('movie'|'ott_release'|'platform'|'cast'|'notification'), entity_id, changes JSONB (before/after), ip_address, created_at
- Create `admin/src/lib/audit.ts` — `logAdminAction(action, entityType, entityId, changes)` utility. Automatically called by all admin mutations.
- Create `admin/app/(dashboard)/audit/page.tsx` — audit log viewer with filters: admin user, action type, entity type, date range. Shows before/after diff for updates.
- **Files:** Migration, audit utility, audit page
- **Tests:** `audit.ts.test.ts` — logs correct data shape. `audit-page.test.tsx` — renders log, filters work, diff display. Migration test.
- **AC:** All admin mutations logged. Audit log viewable with filters. Before/after diff shown for updates.

#### FAN-088: Admin DB Migrations
**Deps:** FAN-069 | **Size:** S
- Create `supabase/migrations/021_admin_rls_policies.sql` — RLS policies for admin-specific operations:
  - `admin_audit_log`: admins read all, system writes
  - `sync_logs`: admins read all, system writes
  - Movies/ott_releases/platforms/movie_cast: admin update/insert/delete (in addition to existing public read)
  - notification_queue: admin read all, admin update status
- **Files:** Migration file
- **Tests:** SQL test: admin can update movies, non-admin cannot. Admin can read audit log, non-admin cannot.
- **AC:** All admin operations properly gated by `is_admin` flag. Non-admins cannot perform admin actions even with direct API calls.

#### FAN-089: Admin Shared Components
**Deps:** FAN-071 | **Size:** M
- Create `admin/src/components/forms/ImageUpload.tsx` — drag-and-drop image upload to Supabase Storage with preview, crop, and size validation
- Create `admin/src/components/forms/MovieSearchCombobox.tsx` — searchable movie selector (used in OTT release form, notification compose)
- Create `admin/src/components/forms/DateRangePicker.tsx` — reusable date range filter
- Create `admin/src/components/ui/StatusBadge.tsx` — colored badge for movie status, notification status
- Create `admin/src/components/ui/ConfirmDialog.tsx` — reusable confirmation dialog for destructive actions
- **Files:** All shared components
- **Tests:** Each component tested: upload, search, date range, badge variants, confirm/cancel.
- **AC:** All shared components work correctly. Used across multiple admin pages.

#### FAN-090: Admin API Middleware
**Deps:** FAN-069, FAN-087 | **Size:** M
- Create `admin/src/lib/api-middleware.ts` — wraps all admin mutations with: auth check (is_admin), audit logging, error handling, optimistic update helpers
- Create `admin/src/lib/query-client.ts` — TanStack Query client with admin-appropriate defaults (shorter staleTime for freshness)
- Create `admin/src/hooks/useAdminMutation.ts` — generic mutation wrapper that handles loading toast, success toast, error toast, audit logging, cache invalidation
- **Files:** Middleware, query client, generic mutation hook
- **Tests:** `api-middleware.test.ts` — rejects non-admin, logs audit, handles errors. `useAdminMutation.test.ts` — toast lifecycle, cache invalidation, audit integration.
- **AC:** All admin mutations go through middleware. Auth verified. Actions audited. Consistent UX with toast notifications.

#### FAN-091: Admin E2E Tests + Vercel Deployment
**Deps:** All FAN-068 to FAN-090 | **Size:** L
- Write Playwright E2E tests:
  - Login flow (admin + non-admin rejection)
  - Movie CRUD (list → edit → save → verify)
  - OTT release CRUD
  - Platform management
  - Notification compose + send
  - TMDB sync trigger
  - Audit log verification
- Configure Vercel deployment:
  - `vercel.json` with env vars
  - Preview deployments on PR
  - Production deployment on main branch merge
- Full quality gate: `npm run lint && npm run typecheck && npm run test && npm run test:e2e`
- **Files:** `admin/e2e/*.spec.ts`, `admin/vercel.json`, CI config
- **Tests:** All Playwright E2E tests above
- **AC:** All E2E tests pass. Vercel preview + production deployments work. Admin panel fully functional and deployed.

---

## Ticket Summary

| Phase | Tickets | IDs | Complexity |
|-------|---------|-----|-----------|
| **Phase 1: Foundation** | 22 | FAN-001 to FAN-022 | 8S, 11M, 3L, 0XL |
| **Phase 2: Details + Watchlist + OTT** | 17 | FAN-023 to FAN-039 | 7S, 10M, 0L, 0XL |
| **Phase 3: Reviews + Notifications** | 16 | FAN-040 to FAN-055 | 3S, 11M, 2L, 0XL |
| **Phase 4: Polish + Launch** | 12 | FAN-056 to FAN-067 | 1S, 6M, 4L, 1XL |
| **Phase 5: Admin Panel** | 24 | FAN-068 to FAN-091 | 6S, 15M, 3L, 0XL |
| **Total** | **91 tickets** | FAN-001 to FAN-091 | 25S, 53M, 12L, 1XL |

## Dependency Flow (Critical Path)

```
Phase 1: FAN-001 → 002 → 003 → 004 → 005 → {006, 016}
          006 → {007, 008} → 009 → {010-014, 015}
          016 → 017 (needs 006 + 016) → {018 (needs 015 + 017), 020}
          018 → 019 (leaf)
          020 → 021
          {015, 008, 007} → 022
Phase 2: {023 → {024, 025, 034}} | {026 (needs 016), 029 (needs 005)} | {027 → {028, 030}} | {031 → {032, 033}}
          {035 (needs 004) → {036, 037}} | {038 (needs 021 + 017)} → 039
Phase 3: {040, 041} → {042, 043} → {044, 045, 046 (needs 042 + 043 + 023)} | {047 → 048 → {049, 050} → 051 → 052} → {053, 054} → 055
Phase 4: {056 → 059 → 062} | {057, 058} | {060 → 061} | {063 → 064} | 065 → 066 → 067
Phase 5: 068 → {069, 071} → {070, 087, 088} (need 069) → {072, 076, 078, 079, 082, 083, 084, 089} → {073, 075, 077, 080, 085, 086, 090} → {074, 081} → 091
```

**Key dependency notes:**
- FAN-016 (TMDB Sync) depends only on FAN-005, can start in parallel with FAN-006
- FAN-017 depends on BOTH FAN-006 + FAN-016 (sequential, not parallel)
- FAN-026 (Enrichment Edge Fn) depends on FAN-016, NOT on FAN-023
- FAN-029 (OTT Sync Edge Fn) depends on FAN-005, NOT on FAN-027
- FAN-035 (i18n) depends on FAN-004, can start early in Phase 2

## Environment Variables

```
# Mobile App (.env.local)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Edge Function secrets (supabase secrets set)
TMDB_API_KEY=your_tmdb_v3_api_key
EXPO_ACCESS_TOKEN=your_expo_access_token
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin Panel (admin/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # server-side only, never in NEXT_PUBLIC_
```

## Verification Plan

1. **Auth**: All 4 providers (Google, Apple, Phone, Email). Session persistence across restarts.
2. **Calendar (Theatrical)**: Gold dots on correct dates. Month navigation. Day tap → movie list.
3. **Calendar (OTT)**: Blue dots for OTT premieres, purple for OTT originals. Filter toggle works.
4. **Movie Detail**: Hero, cast, trailer, synopsis. "Where to Watch" with platform logos + deep links.
5. **Watchlist**: Add/remove with optimistic UI. Grouped sections. Notification queue rows created/cancelled.
6. **OTT Notifications**: Add movie to watchlist → insert OTT release → verify notification scheduled.
7. **Reviews**: Write → edit → delete. Verify vote_average recalculates. Infinite scroll + sort.
8. **Push Notifications**: Token registered. Watchlist notifications delivered. Weekly digest delivered. Tap deep-links to movie.
9. **Theme**: Light/dark/system toggle. All screens respect theme.
10. **i18n**: Switch to Telugu. All strings translated. Telugu font renders correctly.
11. **Cross-platform**: Full flow on iOS simulator + Android emulator.
12. **Admin Login**: Admin user can log in. Non-admin users see "Access Denied".
13. **Admin Movie CRUD**: List, edit, add manual movie, re-sync from TMDB, toggle featured, change status.
14. **Admin OTT Management**: List, add, edit, delete OTT releases. Platform CRUD with reorder.
15. **Admin Cast Curation**: Edit Telugu names. Manage cast per movie (add, remove, reorder).
16. **Admin Notifications**: View queue, cancel/retry, compose + send custom notification, bulk actions.
17. **Admin Sync**: View sync logs, trigger manual TMDB sync, verify movies added/updated.
18. **Admin Audit**: All admin actions logged. Audit log viewable with before/after diffs.

---

## Local Development Setup Plan

### Context

The app currently has no way to run locally — there's no `.env.local`, no `supabase/config.toml`, and no seed data. Without a Supabase backend, the app crashes on startup because `process.env.EXPO_PUBLIC_SUPABASE_URL` is undefined. We need a local Supabase instance with seed data so the app shows sample Telugu movies without requiring a cloud Supabase project.

### Prerequisites

- **Docker Desktop** must be installed and running (Supabase local runs ~10 containers)
- **Homebrew** (macOS)

### Step 1: Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

### Step 2: Initialize local Supabase

```bash
cd /Users/raghup/faniverz-app
supabase init
```

This creates `supabase/config.toml`. Then modify it to disable email confirmations for local dev:

```toml
[auth.email]
enable_confirmations = false
```

### Step 3: Fix pg_trgm extension issue

Migration `017_indexes.sql` line 39 uses `gin_trgm_ops` which requires the `pg_trgm` extension. No existing migration enables it. **Create a new migration that runs first:**

**Create:** `supabase/migrations/000_enable_extensions.sql`
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Step 4: Create seed data

**Create:** `supabase/seed.sql` (auto-run by `supabase db reset` after migrations)

Contents:
- **~20 Telugu movies** with realistic data: Pushpa 2, Kalki 2898 AD, Devara, Salaar, HanuMan, Hi Nanna, Lucky Bhaskar, Game Changer, etc. Mix of released/upcoming/postponed/OTT original. Correct `tmdb_id`, `poster_path`, genres, Telugu titles (`title_te`), release dates, runtime, certification.
- **Cast entries** for major movies (Allu Arjun, NTR Jr., Prabhas, directors, etc.) with Telugu names
- **OTT release entries** linking some released movies to platforms (Netflix, Prime, Aha, etc.)
- **Two test users** inserted directly into `auth.users`:
  - `test@faniverz.com` / `password123` (regular user)
  - `admin@faniverz.com` / `admin123` (admin user, `is_admin = true`)
- The `handle_new_user()` trigger from migration 001 auto-creates profiles
- All inserts use `ON CONFLICT DO NOTHING` for idempotency

### Step 5: Start Supabase and apply everything

```bash
supabase start    # First run: pulls Docker images, applies migrations + seed
supabase status   # Shows local URLs and keys
```

### Step 6: Create .env.local files

**Create:** `.env.local` (mobile app)
```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```

**Create:** `admin/.env.local` (admin panel)
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

### Step 7: Run the app

```bash
npx expo start          # Mobile app
cd admin && npm run dev  # Admin panel (separate terminal)
```

Login with `test@faniverz.com` / `password123`. The calendar should show Telugu movies, explore tab should show sections, etc.

### Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/000_enable_extensions.sql` | Create | Enable `pg_trgm` for trigram search index |
| `supabase/seed.sql` | Create | ~20 movies, cast, OTT releases, 2 test users |
| `supabase/config.toml` | Auto-generated by `supabase init`, then modify | Disable email confirmations |
| `.env.local` | Create | Local Supabase URL + anon key |
| `admin/.env.local` | Create | Local Supabase URL + keys |

No existing source files need modification.

### Verification

1. `supabase status` shows all services running
2. Visit `http://127.0.0.1:54323` (Supabase Studio) — verify movies table has ~20 rows
3. `npx expo start` — app boots without crash
4. Login with test credentials — redirects to tabs
5. Calendar shows movies on their release dates
6. Explore tab shows movie cards
7. Admin panel at `localhost:3000` — login with admin credentials, see movie list
