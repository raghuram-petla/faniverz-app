# Faniverz

A Telugu movie calendar and OTT discovery app. Track theatrical releases, streaming availability across 8 OTT platforms, manage your watchlist, write reviews, and discover surprise content — all in one place.

Built with React Native (Expo) for mobile and Next.js for the admin panel, backed by Supabase (PostgreSQL).

## Features

**Mobile App**

- Movie calendar with theatrical and OTT release schedules
- Discovery and search with genre, platform, and status filters
- Watchlist tracking (to-watch and watched)
- Community reviews and ratings
- News feed (trailers, posters, behind-the-scenes)
- Surprise content (songs, interviews, short films)
- Push notifications for upcoming releases
- Bilingual support (English and Telugu)
- Dark theme with red accent

**Admin Panel**

- Full CRUD for movies, actors, production houses, OTT releases
- TMDB sync engine for bulk movie/actor imports
- News feed and surprise content management
- Push notification composer
- Role-based access control (super_admin, admin, production_house_admin)
- Audit logging for all data changes
- User impersonation for support

## Tech Stack

| Layer    | Technology                                                      |
| -------- | --------------------------------------------------------------- |
| Mobile   | React Native 0.81, Expo SDK 54, Expo Router v4                  |
| State    | Zustand v5, TanStack Query v5                                   |
| Admin    | Next.js 16, Tailwind CSS v4, React Hook Form, TanStack Table v8 |
| Backend  | Supabase (PostgreSQL 17, Auth, Storage, RLS)                    |
| Testing  | Jest 29 + RTL (mobile), Vitest 4 + RTL (admin)                  |
| CI/Build | EAS Build, Husky + lint-staged                                  |
| Storage  | Cloudflare R2 (movie posters, backdrops, actor photos)          |
| i18n     | i18next (English, Telugu)                                       |

## Prerequisites

Before you begin, install the following:

- **Node.js** 18.x, 20.x, or 22.x
- **Yarn** 1.x (`npm install -g yarn`) — the project enforces Yarn 1.22.22 via `packageManager`
- **Docker Desktop** — required for local Supabase
- **Supabase CLI** — `brew install supabase/tap/supabase` (macOS) or [install guide](https://supabase.com/docs/guides/cli/getting-started)
- **Expo CLI** — `npm install -g expo-cli` (optional, `npx expo` works too)
- **EAS CLI** — `npm install -g eas-cli` (for building native apps)
- **Xcode** (macOS, for iOS simulator) or **Android Studio** (for Android emulator)

## Quick Start

### Automated Setup (Recommended)

```bash
# 1. Clone the repo
git clone <repo-url> faniverz-app
cd faniverz-app

# 2. Run the setup script (installs deps, starts Supabase + MinIO, configures .env files)
bash scripts/setup-local.sh

# 3. Start the mobile app
yarn start
# Press 'i' for iOS simulator, 'a' for Android emulator

# 4. Start the admin panel (in a separate terminal)
cd admin && yarn dev
# Opens at http://localhost:3000
```

The setup script automates: dependency installation, Supabase start, MinIO (local S3/R2 storage) start, bucket creation, environment file configuration, and database migrations.

**Services started by the script:**
| Service | URL |
|---------|-----|
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |
| MinIO S3 API | http://localhost:9000 |

**Stop services:** `supabase stop && docker stop faniverz-minio`

### Manual Setup

```bash
# 1. Clone the repo
git clone <repo-url> faniverz-app
cd faniverz-app

# 2. Install mobile dependencies
yarn install

# 3. Install admin dependencies
cd admin && yarn install && cd ..

# 4. Set up environment variables
cp .env.example .env.local          # Mobile app
cp admin/.env.example admin/.env.local  # Admin panel
# Edit both files with your Supabase credentials (see Environment Variables below)

# 5. Start local Supabase (requires Docker)
supabase start
# Note the API URL and anon key from the output — add them to your .env files

# 6. Apply migrations and seed data
supabase db reset
# This runs all migrations and seeds the DB with initial data

# 7. Start the mobile app
yarn start
# Press 'i' for iOS simulator, 'a' for Android emulator

# 8. Start the admin panel (in a separate terminal)
cd admin && yarn dev
# Opens at http://localhost:3000
```

## Project Structure

```
faniverz-app/
├── app/                    # Expo Router screens (mobile)
│   ├── (tabs)/             #   Bottom tab navigator (Home, Calendar, Feed, Watchlist, Profile)
│   ├── (auth)/             #   Auth screens (Login, Register, Forgot Password)
│   ├── movie/[id].tsx      #   Movie detail screen
│   ├── actor/[id].tsx      #   Actor profile screen
│   ├── profile/            #   Profile sub-screens (Settings, Account, Edit, etc.)
│   ├── discover.tsx        #   Movie discovery with filters
│   ├── search.tsx          #   Global search
│   ├── notifications.tsx   #   Notification center
│   └── surprise.tsx        #   Surprise content
├── src/                    # Mobile app source code
│   ├── components/         #   UI components organized by feature
│   ├── features/           #   Feature modules (auth, movies, actors, reviews, etc.)
│   ├── stores/             #   Zustand stores (UI, filters, calendar, feed)
│   ├── lib/                #   Supabase client, query client
│   ├── theme/              #   Colors, typography, spacing, ThemeContext
│   ├── i18n/               #   i18next config + translations (en, te)
│   ├── constants/          #   App-wide constants and helpers
│   ├── utils/              #   Utility functions (date formatting, etc.)
│   ├── types/              #   TypeScript type definitions
│   └── styles/             #   Extracted StyleSheet files
├── admin/                  # Next.js admin panel (see admin/README.md)
├── shared/                 # Shared code between mobile and admin
│   ├── types.ts            #   Shared TypeScript types
│   ├── colors.ts           #   Color palette
│   ├── constants.ts        #   OTT platforms, genres, release types
│   ├── imageUrl.ts         #   Image URL helpers
│   ├── movieStatus.ts      #   Movie status enums
│   └── themes.ts           #   Theme definitions
├── supabase/               # Database
│   ├── config.toml         #   Local Supabase config
│   ├── migrations/         #   41 PostgreSQL migration files
│   └── (no seed — use admin TMDB sync)
├── scripts/                # Setup and data pipeline scripts
│   ├── setup-local.sh           # Automated local dev setup (Supabase + MinIO)
│   ├── seed-telugu-movies.ts    # TMDB movie import
│   ├── migrate-images-to-storage.ts
│   └── fix-r2-urls.ts
├── docs/                   # Additional documentation
│   ├── data-pipeline.md
│   └── cloudflare-custom-domain-setup.md
├── assets/                 # App icons, splash screens
├── package.json            # Mobile dependencies and scripts
├── tsconfig.json           # TypeScript config (strict, path aliases)
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest mocks (Supabase, Reanimated, etc.)
├── babel.config.js         # Babel (expo preset, module resolver, reanimated)
├── eslint.config.js        # ESLint 9 flat config
├── app.json                # Expo app configuration
├── eas.json                # EAS Build profiles
└── CLAUDE.md               # Codebase rules and conventions
```

## Mobile App Setup (Detailed)

### Environment Variables

Create `.env.local` in the project root:

```env
# Required — Supabase connection
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Optional — Only needed for seed/migration scripts
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_PUBLIC_BASE_URL_POSTERS=https://pub-xxxx.r2.dev
R2_PUBLIC_BASE_URL_BACKDROPS=https://pub-yyyy.r2.dev
R2_PUBLIC_BASE_URL_ACTORS=https://pub-zzzz.r2.dev
```

When using local Supabase, the URL and anon key are printed by `supabase start`:

- URL: `http://127.0.0.1:54321`
- Anon key: printed in terminal output

### Local Supabase Setup

```bash
# Start local Supabase (requires Docker running)
supabase start

# Output will show:
#   API URL:   http://127.0.0.1:54321
#   DB URL:    postgresql://postgres:postgres@127.0.0.1:54322/postgres
#   Studio:    http://127.0.0.1:54323  (visual DB editor)
#   Inbucket:  http://127.0.0.1:54324  (email testing)
#   anon key:  eyJ...
#   service_role key: eyJ...

# Apply all migrations and seed data
supabase db reset

# Stop when done
supabase stop
```

**Local Supabase ports:**
| Service | Port |
|---------|------|
| API | 54321 |
| Database (PostgreSQL 17) | 54322 |
| Studio (DB GUI) | 54323 |
| Inbucket (Email) | 54324 |

### Running the Mobile App

```bash
# Start Expo dev server
yarn start

# Platform-specific:
yarn ios       # Run on iOS simulator (requires Xcode)
yarn android   # Run on Android emulator (requires Android Studio)
yarn web       # Run in browser
```

For physical devices, use Expo Go or create a development build:

```bash
# Create a development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Running Tests

```bash
# Run all tests
yarn test

# Run with coverage
yarn test -- --coverage

# Run a specific test file
yarn test -- src/features/movies/__tests__/hooks.test.ts

# Watch mode
yarn test -- --watch
```

> **Note:** The `--forceExit` flag is needed in CI due to TanStack Query timer leaks. The `yarn test` script includes `--silent` by default.

### Linting and Type Checking

```bash
# ESLint
yarn lint

# TypeScript type check (no output = no errors)
yarn typecheck
```

### Quality Gates

Run all three after every change:

```bash
npx eslint . && npx tsc --noEmit && npx jest --silent --forceExit
```

## Admin Panel

The admin panel is a separate Next.js application in the `admin/` directory. See **[admin/README.md](admin/README.md)** for complete setup and development docs.

Quick start:

```bash
cd admin
yarn install
cp .env.example .env.local  # Add Supabase credentials + service role key
yarn dev                    # http://localhost:3000
```

## Database

### Schema Overview

The PostgreSQL database contains these core tables:

| Table                   | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `profiles`              | User profiles (display name, avatar, preferences)                                    |
| `movies`                | Movie master data (title, synopsis, release date, genres, TMDB ID)                   |
| `actors`                | Actor profiles (bio, photos, filmography)                                            |
| `cast`                  | Movie-actor relationships (role, credit type, display order)                         |
| `ott_platforms`         | 8 OTT platform records (aha, Netflix, Prime, Hotstar, Zee5, SunNXT, SonyLIV, EtvWin) |
| `movie_platforms`       | Movie availability on OTT platforms (with dates)                                     |
| `movie_posters`         | Multiple poster images per movie                                                     |
| `movie_videos`          | Trailers, songs, BTS content (YouTube IDs)                                           |
| `movie_theatrical_runs` | Theatrical release schedule                                                          |
| `production_houses`     | Movie studios/production companies                                                   |
| `reviews`               | User reviews with ratings (1-5 scale)                                                |
| `watchlist_entries`     | User's to-watch and watched lists                                                    |
| `favorite_actors`       | User's favorite actors                                                               |
| `notifications`         | Push notification queue                                                              |
| `news_feed`             | News feed items (trailers, posters, updates)                                         |
| `surprise_content`      | Hidden surprise content (songs, interviews, BTS)                                     |
| `admin_users`           | Admin accounts with RBAC roles                                                       |
| `audit_logs`            | Admin action audit trail                                                             |

### Migration Workflow

```bash
# Create a new migration
supabase migration new my_migration_name

# Apply migrations locally
supabase db reset

# Push migrations to remote
supabase db push
```

> **Important:** Never modify already-applied migration files. Always create a new migration file for schema changes.

### Row-Level Security (RLS)

All tables have RLS policies enabled:

- Users can only read/write their own data (watchlist, reviews, favorites)
- Public read access for movies, actors, platforms
- Admin operations require authenticated admin role
- Service role key bypasses RLS (used in admin API routes only)

## Scripts

### TMDB Movie Seed Script

Bulk import Telugu movies from TMDB into Supabase:

```bash
# Test run: 5 movies from 2025, skip image upload
TMDB_API_KEY=xxx \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=xxx \
  npx tsx scripts/seed-telugu-movies.ts --year 2025 --limit 5 --skip-images

# Full import with R2 image upload
TMDB_API_KEY=xxx \
SUPABASE_URL=xxx \
SUPABASE_SERVICE_ROLE_KEY=xxx \
R2_ACCOUNT_ID=xxx \
R2_ACCESS_KEY_ID=xxx \
R2_SECRET_ACCESS_KEY=xxx \
  npx tsx scripts/seed-telugu-movies.ts --year 2024 --year 2025
```

The script is idempotent — safe to re-run; only new movies are fetched.

### Image Migration Script

Migrate images from TMDB URLs to Cloudflare R2:

```bash
npx tsx scripts/migrate-images-to-storage.ts
```

## Environment Variables Reference

### Mobile App (root `.env.local`)

| Variable                        | Required | Description                                  |
| ------------------------------- | -------- | -------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                         |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous/public key                |
| `R2_ACCOUNT_ID`                 | No       | Cloudflare R2 account ID (seed scripts only) |
| `R2_ACCESS_KEY_ID`              | No       | R2 access key (seed scripts only)            |
| `R2_SECRET_ACCESS_KEY`          | No       | R2 secret key (seed scripts only)            |
| `R2_PUBLIC_BASE_URL_POSTERS`    | No       | R2 public URL for movie posters              |
| `R2_PUBLIC_BASE_URL_BACKDROPS`  | No       | R2 public URL for movie backdrops            |
| `R2_PUBLIC_BASE_URL_ACTORS`     | No       | R2 public URL for actor photos               |

### Admin Panel (`admin/.env.local`)

| Variable                        | Required | Description                              |
| ------------------------------- | -------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous/public key            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key (bypasses RLS) |

### Seed Scripts (additional)

| Variable                    | Required | Description                 |
| --------------------------- | -------- | --------------------------- |
| `TMDB_API_KEY`              | Yes      | TMDB v3 API key             |
| `SUPABASE_URL`              | Yes      | Supabase URL (can be local) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key            |

## Deployment

### Mobile App (EAS Build)

The project uses [EAS Build](https://docs.expo.dev/build/introduction/) with three profiles defined in `eas.json`:

| Profile       | Distribution           | Use Case                                |
| ------------- | ---------------------- | --------------------------------------- |
| `development` | Internal               | Dev builds with dev client              |
| `preview`     | Internal               | Testing builds for team                 |
| `production`  | App Store / Play Store | Release builds (auto-increment version) |

```bash
# Development build
eas build --profile development --platform ios

# Preview build
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Admin Panel

Standard Next.js deployment. Deploy to Vercel, Netlify, or any Node.js host:

```bash
cd admin
yarn build
yarn start
```

## Documentation

- [Admin Panel Setup](admin/README.md)
- [Contributing Guide](docs/contributing.md) — Code conventions, quality gates, 300-line rule
- [Data Pipeline](docs/data-pipeline.md) — TMDB sync and image migration
- [Cloudflare Custom Domain Setup](docs/cloudflare-custom-domain-setup.md)

## Test Coverage

| Area   | Tests | Suites | Framework                              |
| ------ | ----- | ------ | -------------------------------------- |
| Mobile | 950+  | 88     | Jest 29 + React Native Testing Library |
| Admin  | 165+  | 27     | Vitest 4 + React Testing Library       |

Target: 100% coverage of business logic. See [Contributing Guide](docs/contributing.md) for test conventions.
