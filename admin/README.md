# Faniverz Admin Panel

Content management dashboard for the Faniverz app. Manage movies, actors, OTT releases, news feed, surprise content, push notifications, and more — with role-based access control and full audit logging.

Built with Next.js 16, Tailwind CSS v4, and Supabase.

## Tech Stack

| Layer            | Technology                                 |
| ---------------- | ------------------------------------------ |
| Framework        | Next.js 16 (App Router)                    |
| Styling          | Tailwind CSS v4                            |
| Forms            | React Hook Form v7 + Zod v4                |
| Data             | TanStack Query v5, TanStack Table v8       |
| Auth             | Supabase Auth (email-based admin accounts) |
| Backend          | Supabase (shared with mobile app)          |
| Testing          | Vitest 4 + React Testing Library           |
| Icons            | Lucide React                               |
| Charts           | Recharts                                   |
| Drag & Drop      | @dnd-kit (cast ordering, display order)    |
| Image Processing | Sharp (server-side resizing for R2 upload) |

## Setup

### Prerequisites

- Node.js 18+ (same as root project)
- Yarn 1.x
- Local Supabase running (see root [README.md](../README.md))

### Install Dependencies

```bash
cd admin
yarn install
```

### Environment Variables

Create `admin/.env.local`:

```env
# Supabase connection (same project as mobile app)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Service role key — required for admin API routes (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

For local development, use the keys printed by `supabase start` in the root project.

### Run Development Server

```bash
yarn dev
# Opens at http://localhost:3000
```

### Build for Production

```bash
yarn build
yarn start
```

## Admin Roles

The admin panel uses role-based access control (RBAC) with three tiers:

### super_admin

- Full access to all pages and entities
- Can manage admin users and send invitations
- Sees all audit logs
- Can impersonate other admin users

### admin

- Access to all pages except **Users**
- Full CRUD on all entities (movies, actors, platforms, etc.)
- Sees only own audit logs

### production_house_admin

- Limited to: Dashboard, Movies, Cast, Production Houses, OTT, Audit
- Can only manage movies/actors from their assigned production house(s)
- Can create movies, actors, and OTT releases
- Cannot manage platforms, surprise content, feed, notifications, or sync

### Permission Matrix

| Page              | super_admin |   admin   | production_house_admin |
| ----------------- | :---------: | :-------: | :--------------------: |
| Dashboard         |     Yes     |    Yes    |          Yes           |
| Movies            |     Yes     |    Yes    |   Yes (own PH only)    |
| Cast              |     Yes     |    Yes    |     Yes (own only)     |
| Production Houses |     Yes     |    Yes    |   Yes (own PH only)    |
| OTT               |     Yes     |    Yes    |          Yes           |
| Platforms         |     Yes     |    Yes    |           No           |
| Surprise          |     Yes     |    Yes    |           No           |
| Feed              |     Yes     |    Yes    |           No           |
| Notifications     |     Yes     |    Yes    |           No           |
| Sync              |     Yes     |    Yes    |           No           |
| Audit             |     Yes     | Yes (own) |       Yes (own)        |
| Users             |     Yes     |    No     |           No           |

## Pages

### Dashboard

Stats overview: total movies, actors, users, reviews, recent activity.

### Movies

Full movie management with TMDB integration:

- Create/edit movies (title, synopsis, release date, genres, certification)
- Manage posters (multiple per movie, drag-to-reorder, set main poster)
- Manage videos (trailers, songs, BTS — YouTube integration)
- Manage cast (assign actors to roles, drag-to-reorder)
- Manage theatrical runs (release schedule variants)
- Link to production houses
- Set image focal points for responsive cropping

### Cast

Actor/technician management:

- Search and list actors
- Edit bio, photos, birthdate, place of birth
- View filmography (auto-linked from movie cast)

### OTT

Manage streaming availability:

- Link movies to OTT platforms with availability dates
- Track which movies are available where

### Platforms

Manage the 8 supported OTT platforms (aha, Netflix, Prime Video, Hotstar, Zee5, SunNXT, SonyLIV, EtvWin):

- Platform name, logo, brand color, display order

### Feed

News feed content management:

- Create feed items (video, poster, surprise, update types)
- Pin items to top, mark as featured
- Set display order and publish dates

### Surprise

Hidden surprise content (songs, short films, BTS, interviews):

- Create/edit surprise items
- Category management
- View counts tracking

### Notifications

Push notification management:

- Compose and schedule notifications
- Target all users or specific segments
- View delivery history and status (pending, sent, failed, cancelled)

### Sync (TMDB Sync Center)

Granular TMDB sync operations:

- **Discover** — Find new Telugu movies on TMDB
- **Import** — Batch import movies from TMDB
- **Refresh Movie** — Update single movie data from TMDB
- **Refresh Actor** — Update actor data from TMDB
- **Stale Items** — Find entries that need updating
- **Lookup** — Search TMDB by ID

### Audit

Full audit trail of all data changes:

- Who changed what, when, and what the old/new values were
- super_admin sees all logs; others see only their own actions
- Tracks impersonation (who impersonated whom)

### Users

Admin user management (super_admin only):

- View all admin users
- Send invitations to new admins
- Assign roles

## TMDB Sync

The admin panel includes a sync engine for importing and refreshing movie/actor data from TMDB.

### How It Works

1. **API Routes** in `src/app/api/sync/` handle TMDB API calls server-side
2. **Sync Engine** (`src/lib/sync-engine.ts`) maps TMDB data to Faniverz schema
3. **Image Processing** — Posters and backdrops are resized via Sharp and uploaded to Cloudflare R2
4. **Sync Logging** — All sync operations are logged for debugging

### API Routes

| Route                     | Method | Purpose                            |
| ------------------------- | ------ | ---------------------------------- |
| `/api/sync/discover`      | POST   | Discover new Telugu movies on TMDB |
| `/api/sync/import-movies` | POST   | Import selected movies from TMDB   |
| `/api/sync/lookup`        | GET    | Look up a movie by TMDB ID         |
| `/api/sync/refresh-movie` | POST   | Refresh a single movie's data      |
| `/api/sync/refresh-actor` | POST   | Refresh a single actor's data      |
| `/api/sync/stale-items`   | GET    | Find entries needing refresh       |

### Upload Routes

| Route                               | Purpose                            |
| ----------------------------------- | ---------------------------------- |
| `/api/upload/movie-poster`          | Upload movie poster to R2          |
| `/api/upload/movie-backdrop`        | Upload movie backdrop to R2        |
| `/api/upload/actor-photo`           | Upload actor photo to R2           |
| `/api/upload/platform-logo`         | Upload platform logo to R2         |
| `/api/upload/production-house-logo` | Upload production house logo to R2 |

## Testing

### Run Tests

```bash
yarn test              # Run all tests
npx vitest --watch     # Watch mode
npx vitest --coverage  # Coverage report
```

### Test Conventions

- Framework: **Vitest** (not Jest)
- Mocking: Use `vi.mock()`, `vi.fn()`, `vi.spyOn()` (not `jest.mock()`)
- DOM: `jsdom` environment
- Assertions: `@testing-library/jest-dom` matchers
- User events: `@testing-library/user-event`
- Components use **named exports** — import with `{ Component }` not default

Example test:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from './MyComponent';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { from: vi.fn() },
}));

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Quality Gates

Run all three after every change:

```bash
npx eslint . --max-warnings 0 && npx tsc --noEmit && npx vitest run
```

- ESLint: **zero warnings** policy (stricter than mobile)
- TypeScript: strict mode, no emit
- Tests: all must pass

## Project Structure

```
admin/src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               #   Root layout (providers)
│   ├── login/page.tsx           #   Admin login
│   ├── api/                     #   API routes (sync, upload, invitations)
│   └── (dashboard)/             #   Protected dashboard routes
│       ├── layout.tsx           #     Dashboard shell (sidebar + navbar)
│       ├── page.tsx             #     Dashboard home
│       ├── movies/              #     Movie CRUD pages
│       ├── cast/                #     Actor CRUD pages
│       ├── feed/                #     Feed CRUD pages
│       ├── surprise/            #     Surprise CRUD pages
│       ├── notifications/       #     Notification pages
│       ├── ott/                 #     OTT release pages
│       ├── platforms/           #     Platform list
│       ├── production-houses/   #     Production house pages
│       ├── sync/                #     TMDB sync center
│       ├── audit/               #     Audit log viewer
│       └── users/               #     User management
├── components/                  # UI components by feature
│   ├── common/                  #   Shared (Button, Input, Modal, DataTable)
│   ├── layout/                  #   Sidebar, Navbar
│   ├── movie-edit/              #   Movie editing form sections
│   ├── cast/                    #   Actor listing
│   ├── cast-edit/               #   Actor editing form sections
│   ├── feed/                    #   Feed list and form
│   ├── sync/                    #   Sync center components
│   ├── users/                   #   User list and invite form
│   ├── preview/                 #   Content preview components
│   ├── audit/                   #   Audit table
│   └── providers/               #   QueryProvider, ThemeProvider
├── hooks/                       # Custom hooks
│   ├── useAdminMovies.ts        #   Movie CRUD operations
│   ├── useAdminCast.ts          #   Actor CRUD operations
│   ├── useAdminFeed.ts          #   Feed CRUD operations
│   ├── useAdminSync.ts          #   TMDB sync operations
│   ├── usePermissions.ts        #   Role-based access control
│   ├── useImpersonation.tsx     #   Admin impersonation
│   ├── useDashboardStats.ts     #   Dashboard metrics
│   ├── useMovieEdit*.ts         #   Movie edit state (decomposed: State, Handlers, Derived, Types)
│   └── ...                      #   25+ hooks total
├── lib/                         # Utility libraries
│   ├── supabase-admin.ts        #   Server-side Supabase (service role)
│   ├── supabase-browser.ts      #   Browser-side Supabase
│   ├── tmdb.ts                  #   TMDB API client
│   ├── sync-engine.ts           #   TMDB-to-Supabase sync logic
│   ├── r2-sync.ts               #   Cloudflare R2 image sync
│   ├── image-resize.ts          #   Sharp image resizing
│   ├── types.ts                 #   Admin-specific types
│   └── utils.ts                 #   Utility functions
└── __tests__/                   # Test files (alongside or here)
```

## Relationship to Mobile App

The admin panel and mobile app share:

- **Same Supabase project** — same database, same auth system
- **Shared types** — `shared/types.ts` is imported by both via `@shared/*` path alias
- **Shared constants** — `shared/colors.ts`, `shared/constants.ts`, etc.

The admin panel is excluded from the root project's ESLint, TypeScript, and Jest configurations via ignore patterns. It has its own independent toolchain.
