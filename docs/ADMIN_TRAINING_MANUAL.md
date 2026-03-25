# Faniverz Admin Panel — Employee Training Manual

> **Version:** 2.0
> **Last Updated:** March 25, 2026
> **Audience:** All admin panel employees (content editors, moderators, super admins)

---

## Table of Contents

1. [Product Philosophy & Design Principles](#1-product-philosophy--design-principles)
2. [Getting Started — Login & First Look](#2-getting-started--login--first-look)
3. [Understanding Your Role & Permissions](#3-understanding-your-role--permissions)
4. [The Language Switcher — Working Across Languages](#4-the-language-switcher--working-across-languages)
5. [Dashboard — Your Home Screen](#5-dashboard--your-home-screen)
6. [Sync — Where All Data Begins](#6-sync--where-all-data-begins)
7. [Movies — The Core Entity](#7-movies--the-core-entity)
8. [Artists (Cast & Crew)](#8-artists-cast--crew)
9. [Production Houses](#9-production-houses)
10. [OTT Platforms](#10-ott-platforms)
11. [In Theaters — Managing Theatrical Runs](#11-in-theaters--managing-theatrical-runs)
12. [Surprise Content](#12-surprise-content)
13. [News Feed](#13-news-feed)
14. [Reviews & Comments — Moderation](#14-reviews--comments--moderation)
15. [Notifications](#15-notifications)
16. [App Users](#16-app-users)
17. [Admin Management](#17-admin-management)
18. [Audit Log](#18-audit-log)
19. [Validations — Image Health Checks](#19-validations--image-health-checks)
20. [Profile Management](#20-profile-management)
21. [Common Patterns You'll Use Every Day](#21-common-patterns-youll-use-every-day)
22. [Troubleshooting & FAQ](#22-troubleshooting--faq)
23. [Appendix A — Keyboard Shortcuts & Tips](#appendix-a--keyboard-shortcuts--tips)
24. [Appendix B — Glossary](#appendix-b--glossary)
25. [Appendix C — Role Permission Matrix](#appendix-c--role-permission-matrix)

---

## 1. Product Philosophy & Design Principles

### What Is Faniverz?

Faniverz is a global movie discovery app. It started with Telugu cinema and is expanding to cover every language and region worldwide. The mobile app is what end users see — a beautiful, cinema-themed experience for discovering movies, reading reviews, tracking OTT availability, and following their favorite artists.

**The admin panel is the engine room.** Everything the user sees in the mobile app — every movie listing, every artist profile, every poster, every "now streaming on Netflix" badge — originates from the admin panel. Your work directly shapes what millions of users experience.

### Core Design Philosophy

**"Clean and simple without so many aesthetics."**

The admin panel is a productivity tool, not a showpiece. Every element exists because it serves a function. There are no decorative flourishes, no unnecessary animations, no visual clutter. If something is on screen, it's there because you need it.

**"Show, don't hide."**

We never hide empty fields. If a movie doesn't have a synopsis yet, you'll see the field with "Not set" displayed in gray — not a blank space that leaves you wondering whether the field exists. This makes it immediately obvious what data is missing and what still needs attention.

**"No partial data."**

When we import a movie from TMDB (our external data source), we import everything — all cast, all crew, all posters, all backdrops, all videos, all keywords, all streaming platforms. We never silently skip data. A partially imported movie is worse than no movie at all because it creates a false sense of completeness.

### The Data Pipeline (How Content Flows)

```
TMDB (External Database)
    ↓  Sync/Import
Admin Panel Database
    ↓  Manual Curation & Enrichment
Mobile App (What Users See)
```

1. **TMDB** is our primary external data source — a massive movie database with metadata, posters, cast lists, and streaming availability for movies worldwide.
2. **You import** movies from TMDB into our system via the Sync page.
3. **You curate** — fix titles, add missing data, upload better posters, manage theatrical runs, set OTT availability.
4. **The mobile app** reads from our database and presents it to end users.

Your role is the critical middle step: transforming raw TMDB data into polished, accurate, region-specific movie information.

### Both Themes, Always

The admin panel supports both dark and light themes. You can switch between them in the user menu (top-right corner). All content you manage looks correct in both themes — this is enforced by design.

---

## 2. Getting Started — Login & First Look

### Logging In

1. Navigate to the admin panel URL provided by your team lead.
2. You'll see the Faniverz logo with "Admin" beneath it.
3. Click **"Sign in with Google"** — this is the only authentication method.
4. Use your authorized Google account (the one your admin invitation was sent to).
5. On successful login, you'll be redirected to the **Dashboard**.

> **Note:** If this is your first time logging in after receiving an invitation, the system automatically accepts your invitation during the OAuth flow. No separate "accept invitation" step is needed.

### If Login Fails

- **"Access Blocked" screen with a reason:** Your admin account has been blocked. Contact your super admin.
- **"No access" error:** Your Google account doesn't have an admin role assigned. Contact your super admin to get an invitation.
- **Google OAuth error:** Try clearing your browser cookies or using an incognito window.

### What You See After Login

The admin panel has three main areas:

```
┌──────────────────────────────────────────────────────┐
│  HEADER (breadcrumbs, language switcher, user menu)  │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  SIDEBAR   │           MAIN CONTENT AREA             │
│            │                                         │
│  Navigation│   (changes based on selected page)      │
│  Menu      │                                         │
│            │                                         │
├────────────┴─────────────────────────────────────────┤
│  DOCK (appears when you have unsaved changes)        │
└──────────────────────────────────────────────────────┘
```

#### The Header (Top Bar)

- **Left side:** Breadcrumb navigation showing your current location (e.g., `ADMIN → MOVIES → EDIT`)
- **Right side:** Language Switcher (if applicable) and User Menu

#### The Sidebar (Left)

The sidebar is your primary navigation. It's organized into four sections:

**Content:**

- Dashboard
- Movies
- In Theaters
- Artists (labeled "Cast")
- Production Houses
- OTT Platforms
- Surprise Content
- News Feed
- Notifications

**Moderation:**

- Reviews
- Comments

**System:**

- Sync
- Audit Log
- Validations
- App Users
- Admin Management (labeled "Users")

> **Note:** You may not see all of these items. The sidebar only shows pages you have permission to access based on your role.

The sidebar can be collapsed by clicking the toggle near the "CONTENT" section header. When collapsed, it shows only icons.

#### The User Menu (Top-Right)

Click your avatar or email to open the dropdown:

- Your email and role badge (in red)
- **Profile** — manage your avatar
- **Theme** — switch between System, Light, and Dark modes
- **Impersonate** — test the panel as a different role (super admins only)
- **Sign Out**

---

## 3. Understanding Your Role & Permissions

Every admin user is assigned one of five roles. Your role determines what you can see and do in the panel.

### Role Hierarchy

```
root  →  super_admin  →  admin  →  production_house_admin  →  viewer
(highest)                                                      (lowest)
```

### Role Descriptions

#### Root

- **Full access to everything.** Can manage all content, all users, all settings.
- Can delete any top-level entity (movies, actors, production houses).
- Can assign and revoke any role.
- Can impersonate any other role for testing.
- Sees all audit logs across all users.
- Has access to all languages implicitly.

#### Super Admin

- Nearly identical to root, but cannot manage other root users.
- Can delete top-level entities.
- Can manage admins, PH admins, and viewers.
- Can impersonate roles below their own.
- Sees all audit logs.
- Has access to all languages implicitly.

#### Admin

- Can create and edit all content (movies, actors, feed posts, etc.).
- **Cannot** delete top-level entities (movies, actors, production houses).
- Can delete child entities (individual posters, videos, cast entries).
- **Limited to assigned languages** — you only see movies in languages you've been assigned.
- Sees only your own audit log entries.

#### Production House Admin (PH Admin)

- **Scoped to your assigned production houses.** You only see movies, actors, and content related to your production house(s).
- Can create movies, actors, and OTT releases within your scope.
- Can only edit actors you created.
- Cannot delete any top-level entity.
- Limited page access: Dashboard, Movies, Cast, Production Houses, In Theaters, Audit Log.
- The language switcher is not shown for PH admins — you work within your production house scope.

#### Viewer

- **Read-only access.** You can see all pages but cannot create, edit, or delete anything.
- Useful for stakeholders who need visibility without modification rights.
- All buttons and forms are disabled (grayed out).
- A "Read Only" banner appears at the top of each page.

### What You Cannot Do (Per Role)

| Action                | Root | Super Admin | Admin          | PH Admin | Viewer          |
| --------------------- | ---- | ----------- | -------------- | -------- | --------------- |
| View all pages        | Yes  | Yes         | Yes            | Limited  | Yes (read-only) |
| Create content        | Yes  | Yes         | Yes            | Scoped   | No              |
| Edit content          | Yes  | Yes         | Yes            | Scoped   | No              |
| Delete movies/actors  | Yes  | Yes         | No             | No       | No              |
| Delete posters/videos | Yes  | Yes         | Yes            | No       | No              |
| Manage admin users    | Yes  | Yes         | Limited        | No       | No              |
| Impersonate           | Yes  | Yes         | No             | No       | No              |
| See all audit logs    | Yes  | Yes         | No             | No       | No              |
| Switch languages      | Yes  | Yes         | If 2+ assigned | No       | No              |

---

## 4. The Language Switcher — Working Across Languages

### What It Is

The Language Switcher is a dropdown in the top-right corner of the header (next to your user menu). It controls which language's content you see throughout the admin panel.

### Who Sees It

- **Root and Super Admin:** Always visible. Shows all available languages plus an "All" option.
- **Admin with 2+ assigned languages:** Visible. Shows only your assigned languages.
- **Admin with 1 assigned language:** Hidden. Your single language is auto-selected.
- **PH Admin and Viewer:** Hidden. Content is scoped differently for these roles.

### How It Works

1. **Select a language** from the dropdown (e.g., Telugu, Tamil, Hindi, English).
2. The **Movies list page** will now filter to show only movies in that language.
3. When you're **browsing** (no search active), only movies matching your selected language appear.
4. When you're **searching** by name, the language filter is temporarily disabled so you can find any movie. However, movies in other languages appear **grayed out and at 40% opacity** — you can see them but cannot click to edit them.

### Switching Languages

If you're assigned to both Telugu and Tamil:

1. Start your day by selecting **Telugu** from the Language Switcher.
2. Work through your Telugu movie tasks.
3. When ready, switch to **Tamil** — the movie list immediately refreshes to show Tamil content.
4. Your selection persists across page navigations and browser refreshes (stored locally).

### "All Languages" Option

Only available to Root and Super Admin. When selected, the movie list shows every movie regardless of language. This is useful for cross-language audits or when searching for a specific movie you're not sure about.

---

## 5. Dashboard — Your Home Screen

The Dashboard is the first page you see after login. It provides a quick overview of the platform's current state and shortcuts to common actions.

### Statistics Cards

Six cards showing real-time counts:

| Card           | What It Shows                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **Movies**     | Total number of movies in the system (PH Admins see "My Movies" — only their production house movies) |
| **Actors**     | Total number of actors and technicians                                                                |
| **Users**      | Total number of registered app users                                                                  |
| **Reviews**    | Total number of user-submitted reviews                                                                |
| **Feed Items** | Total number of feed posts                                                                            |
| **Comments**   | Total number of user comments                                                                         |

Each card displays a loading skeleton while data loads — you'll never see a misleading "0" as a placeholder.

### Quick Action Buttons

Below the stats, you'll find shortcut buttons:

- **Add Movie** — Opens the movie creation form (`/movies/new`)
- **In Theaters** — Opens the theatrical management page (`/theaters`)
- **Add Actor** — Opens the cast page (`/cast`)
- **Add Feed Post** — Opens the feed post creation form (`/feed/new`) (hidden for PH Admins)
- **Trigger Sync** — Opens the sync page (`/sync`) (only if you have sync access)

These buttons let you jump straight to the most common tasks without navigating through the sidebar.

---

## 6. Sync — Where All Data Begins

The Sync page is where movies enter the Faniverz system. This is typically the **first step** in your workflow when adding new content.

### Accessing Sync

Navigate to **System → Sync** in the sidebar, or click "Trigger Sync" on the Dashboard.

### The Three Tabs

The Sync page has three tabs: **Discover**, **Bulk**, and **History**.

---

### Tab 1: Discover

This is your primary tool for finding and importing movies from TMDB.

#### Searching for Movies

1. **Enter a search term** in the search box (minimum 2 characters).
2. Results appear in two sections: **Actors** first, then **Movies**.
3. Each result shows: poster thumbnail, title, release year, and language code.

#### Status Badges on Results

- **Green checkmark ("In DB"):** This movie/actor already exists in our system. These items cannot be selected for import.
- **Yellow alert ("Not in DB"):** This movie/actor hasn't been imported yet.
- **Red ("Selected"):** You've checked this movie for import.
- **Gray ban ("Not your language"):** Your admin role doesn't cover this movie's language — you cannot import it.

> **Note:** If you're an Admin with assigned languages, a language toggle appears above search results (e.g., "Telugu (3) | All (5)"). This lets you switch between showing only movies in your assigned languages or all results. Movies outside your languages appear grayed out with a "Not your language" badge.

#### Discovering by Year/Month

Instead of searching by name, you can discover all movies in a language for a specific time period:

1. Select a **Year** (e.g., 2025).
2. Optionally select one or more **Months** using the multi-select checkboxes (e.g., March and April) — if omitted, discovers the entire year.
3. Select a **Language** (defaults to your active language).
4. Click **Discover**.
5. Results are organized into three sections:
   - **New Movies** — movies not yet in our system, available for import.
   - **Existing Movies** — movies already imported, with field-level gap detection (see "Checking for Gaps in Existing Movies" below).
   - **Duplicate Suspects** — TMDB movies whose titles match movies in our system that don't have a TMDB ID linked yet.

#### Previewing Before Import

Before importing a movie, you can **preview** it:

1. Click on any search result.
2. A preview panel opens showing: full title, release date, runtime, genres, synopsis, cast count, crew count, poster count, backdrop count, video count.
3. This lets you verify it's the right movie before importing.

For actors, the preview shows: name, birthday, place of birth, biography, and photo.

#### Importing a Movie

1. Select one or more movies by clicking the checkbox on each result.
2. Click **Import Selected** (or use "Select all new" / "Deselect all" buttons).
3. The import process begins — movies are imported in batches of up to 5 at a time. You'll see progress indicators:
   - "Importing movie 1 of 3..."
   - "Syncing posters... (5 of 12)"
   - "Syncing backdrops... (2 of 4)"
   - "Iteration 1" (if the process has multiple passes)

**What happens during import:**

- Movie metadata is saved (title, synopsis, release date, runtime, genres, tagline)
- All cast and crew members are imported (actors are created if they don't exist)
- Actor photos are downloaded and uploaded to our image storage
- Movie posters and backdrops are downloaded and stored
- YouTube trailers and videos are linked
- Streaming availability (OTT platforms) is imported for all countries
- Keywords and production companies are linked
- The main poster and backdrop are set automatically

> **Important:** Do NOT switch browser tabs or navigate away during an active import. You'll see an "Unsaved changes" warning if you try. The import will be cancelled if you leave.

#### Importing an Actor

If you find an actor in the search results who isn't in our system:

1. Click on the actor's card.
2. In the preview panel, click **"Import Actor"**.
3. The actor's full profile is imported: name, photo, biography, birth date, place of birth, gender.

If the actor already exists, you'll see a **"Refresh from TMDB"** button instead, which updates their data with the latest from TMDB.

#### Linking a TMDB ID to an Existing Movie

Sometimes a movie was manually created (without TMDB) and you later find it on TMDB. You can link them:

1. Find the TMDB movie in search results.
2. If a "Duplicate Suspect" badge appears, it means our system found a movie with a matching title.
3. Use the **Link** action to connect the TMDB ID to the existing movie — this enables future syncs without creating a duplicate.

#### Checking for Gaps in Existing Movies

When you use Discover by Year, the **Existing Movies** section automatically checks each imported movie against TMDB for missing or outdated data.

1. As each movie is checked, you'll see "Checking..." next to it.
2. Once checked, each movie shows either **"No gaps"** (green) or **"N gap(s)"** (yellow).
3. Click the **expand arrow** on any movie to see a field-by-field comparison table:
   - **Missing** fields (green highlight, pre-checked) — our database is empty but TMDB has data.
   - **Changed** fields (amber highlight, unchecked by default) — both have data but they differ. Check these manually if you want to overwrite.
   - **Same** fields (gray, disabled) — already up to date.
4. Check the fields you want to update, then click **"Apply N selected fields"**.
5. Optionally check **"Re-sync cast & crew"** below the fields table — this performs a full cast refresh.

**Bulk gap fill:** If multiple movies have gaps, a **"Fill all missing (N)"** button appears at the top of the Existing Movies section. Clicking it applies all missing fields across all movies sequentially.

> **Tip:** Gap checking compares 21 fields including title, synopsis, posters, backdrops, videos, cast, keywords, watch providers, certifications, and more.

#### Import Behavior for Discover Results

When importing movies from Discover by Year results (as opposed to search results), movies are imported **one at a time** rather than in batches. If a movie import times out (504 error), the system **automatically retries** up to 15 times with a 1-second delay between attempts. You'll see the retry iteration count during this process.

---

### Tab 2: Bulk

For batch maintenance operations — refreshing stale movies and fetching missing actor biographies.

The Bulk tab has two panels side by side:

#### Left Panel: Stale Movies

Movies that haven't been synced with TMDB recently may have outdated information.

1. Filter by **Year** (e.g., "From 2023+") to scope which movies to check.
2. Filter by **Staleness** — movies not synced in 7, 14, 30, 60, or 90 days.
3. The count updates: "Found X movies".
4. Click **"Preview"** to see the list of stale movies with their last sync timestamps.
5. Click **"Refresh All"** to re-sync all stale movies from TMDB sequentially.
6. A progress bar shows completion. Errors are accumulated and displayed at the end.

#### Right Panel: Missing Actor Bios

Actors imported from TMDB sometimes lack biographies (e.g., if the bio wasn't available at import time).

1. The panel shows a count: "X actors with TMDB ID but no biography".
2. Click **"Preview"** to see the list of affected actors.
3. Click **"Fetch All Bios"** to retrieve biographies from TMDB sequentially.
4. Progress bar and error tracking work the same as the stale movies panel.

> **Note:** Only one bulk operation can run at a time. Both buttons are disabled while a bulk operation is in progress.

---

### Tab 3: History

A log of all past sync operations.

| Column       | Description                                              |
| ------------ | -------------------------------------------------------- |
| **Function** | What type of sync (import, refresh, fill-fields)         |
| **Status**   | Running, Success, or Failed (with color-coded badge)     |
| **Added**    | Count of new movies created                              |
| **Updated**  | Count of existing movies updated                         |
| **Started**  | When the sync was started                                |
| **Duration** | How long the sync took (calculated from start to finish) |

Click on any row to **expand** it and see detailed information — items processed and error details (if any).

When any sync operation has a "Running" status, the table **auto-refreshes** every few seconds so you can monitor progress in real time.

Use History to:

- Verify your imports completed successfully
- Debug failed imports (expand error details)
- Track sync operations and their durations

---

### Re-syncing (Refreshing) Existing Movies

Over time, TMDB updates their data — new posters appear, ratings change, streaming availability shifts. To update a movie with the latest TMDB data:

**Method 1 — From the Movie Edit Page:**

1. Open any movie that has a TMDB ID.
2. In the TMDB Metadata section, you'll see the last sync timestamp.
3. Use the Sync page to refresh it.

**Method 2 — From the Sync Page:**

1. Go to **Sync → Discover**.
2. Search for the movie.
3. Since it already exists (green "In DB" badge), click it.
4. Click **"Refresh from TMDB"** — this performs a full re-sync.

**Method 3 — Selective Field Update (Fill Fields):**

1. From the Sync page, search for the movie.
2. Instead of a full refresh, choose **specific fields** to update:
   - Basic: title, synopsis, poster, backdrop, trailer, director, runtime, genres
   - Metadata: IMDB ID, Telugu translations, tagline, TMDB ratings, budget/revenue, certification
   - Extended: cast, images, videos, watch providers, keywords, production companies
3. Click **Fill Selected Fields** — only those fields are updated; everything else is preserved.

> **When to use Fill Fields vs. Full Refresh:**
>
> - **Fill Fields:** When you've manually curated some data (e.g., a custom synopsis) and don't want it overwritten. Pick only the fields you want from TMDB.
> - **Full Refresh:** When you want the complete latest data from TMDB, replacing everything.

### Finding Stale Items

The system can identify movies and actors that haven't been synced recently. Go to **Sync → Bulk** to find the stale movies panel and missing actor bios panel (see Tab 2: Bulk above for details).

---

## 7. Movies — The Core Entity

Movies are the central entity in Faniverz. Everything else — actors, production houses, OTT platforms, reviews, feed posts — connects back to movies.

### Accessing Movies

Navigate to **Content → Movies** in the sidebar.

### The Movie List

The list page shows all movies in a table with infinite scroll (movies load as you scroll down).

#### Table Columns

| Column           | Description                                    |
| ---------------- | ---------------------------------------------- |
| **Movie**        | Poster thumbnail + title (click title to edit) |
| **Type**         | Status badge (see below)                       |
| **Release Date** | Formatted date or "—" if not set               |
| **Rating**       | Star rating from TMDB (X.X/10)                 |
| **Actions**      | Edit (pencil) and Delete (trash) buttons       |

#### Movie Status Badges

Movie status is **computed automatically** — you don't set it manually. It's derived from the movie's data:

| Badge           | Color  | Meaning                                                   |
| --------------- | ------ | --------------------------------------------------------- |
| **Announced**   | Amber  | Has a release date but no theatrical run, not in theaters |
| **Upcoming**    | Blue   | Release date is in the near future                        |
| **In Theaters** | Red    | Currently showing in cinemas                              |
| **Streaming**   | Purple | Available on at least one OTT platform                    |
| **Released**    | Gray   | Past release date, not in theaters, no active OTT         |

#### Searching & Filtering

**Search box:** Type at least 2 characters to search across all movie titles. When searching, the language filter is temporarily disabled (you see all languages, but non-matching ones are grayed out and unclickable).

**Status filter dropdown:** Filter by Announced, Upcoming, In Theaters, Streaming, Released, or All.

**Advanced filters panel:** Click the filter icon to expand additional filters:

- Actor search — find movies featuring a specific actor
- Director search — find movies by a specific director
- Genre toggle — filter by one or more genres
- Release Year — select a specific year (e.g., 2025)
- Release Month — select a specific month (requires a year to be selected first)
- Min Rating — minimum TMDB rating threshold (1+ through 5+ stars)
- Language — override the language switcher for this search
- Certification — U, UA, or A (CBFC India ratings)
- Platform — movies available on a specific OTT platform
- Featured only — show only movies marked as featured

#### Language Behavior on the List

- **Browsing (no search):** Only movies in your selected language appear.
- **Searching:** All languages shown, but non-matching movies appear at 40% opacity with a grayscale poster. You can see them but cannot click to edit.

---

### Creating a New Movie

There are two ways to add a movie:

#### Method 1: Import from TMDB (Recommended)

Go to the **Sync** page, find the movie, and import it. This pre-fills all available data.

#### Method 2: Manual Creation

1. Click **"Add Movie"** on the movie list page or the Dashboard.
2. Fill in the form (see form sections below).
3. Click **"Create Movie"** in the top-right corner.
4. After creation, you'll be redirected to the edit page where you can add OTT platforms.

> **Note:** The OTT Platforms section is not available during creation — you must save the movie first, then add platforms from the edit page.

---

### Editing a Movie

Click any movie title in the list to open the edit page.

#### Layout

The edit page has a **split layout**:

- **Left column:** The form with section tabs
- **Right column:** A live preview showing how the movie will look in the mobile app

#### The Section Tabs

The edit page has **6 tabs**: Basic Info, Posters, Videos, Cast & Crew, Releases, and TMDB Sync. The TMDB Sync tab only appears if the movie has a TMDB ID linked.

The create page has **5 tabs** (no TMDB Sync tab since the movie hasn't been linked to TMDB yet).

Tabs are displayed as a horizontal navigation bar. Clicking a tab shows that section's fields. **Unsaved changes are preserved when switching tabs** — you won't lose work by looking at a different section.

---

#### Tab 1: Basic Info

This is the primary metadata for the movie.

| Field                 | Type             | Required | Description                                                                     |
| --------------------- | ---------------- | -------- | ------------------------------------------------------------------------------- |
| **Title**             | Text             | Yes      | The movie's display title                                                       |
| **Original Language** | Dropdown         | No       | te (Telugu), hi (Hindi), ta (Tamil), kn (Kannada), ml (Malayalam), en (English) |
| **Release Date**      | Date picker      | No       | Official release date                                                           |
| **Premiere Date**     | Date picker      | No       | Advance premiere/preview date (before general release)                          |
| **Runtime**           | Number (minutes) | No       | Movie duration in minutes                                                       |
| **Tagline**           | Text             | No       | Short tagline (often from TMDB)                                                 |
| **Synopsis**          | Textarea         | No       | Plot summary                                                                    |
| **Certification**     | Dropdown         | No       | CBFC rating: U, UA, or A                                                        |
| **TMDB ID**           | Number           | No       | Links this movie to TMDB for syncing                                            |
| **In Theaters**       | Checkbox         | No       | Is this movie currently in cinemas?                                             |
| **Featured**          | Checkbox         | No       | Show on the mobile app's home screen spotlight                                  |

**Genres** — A row of toggle buttons. Click to select/deselect:
Action, Drama, Comedy, Romance, Thriller, Horror, Sci-Fi, Fantasy, Crime, Family, Adventure, Historical

**TMDB Metadata** (read-only, appears only if TMDB ID is set):

- TMDB Status (Released, Post Production, In Production, Planned, Rumored, Canceled)
- TMDB Rating (vote average and count)
- Budget and Revenue (formatted as USD)
- Collection Name (if part of a franchise)
- Spoken Languages (displayed as badges)
- Last Synced timestamp

> **Validation Rules:**
>
> - Premiere date cannot be after release date.
> - Runtime must be a number.
> - Title is required to save.

---

#### Tab 2: Posters

This section manages the movie's image gallery — both posters (portrait, 2:3 ratio) and backdrops (landscape, 16:9 ratio).

**What you see:**

- Filter tabs: **All**, **Posters**, **Backdrops**
- A grid of image thumbnails
- Badges showing which image is the **Main Poster** and **Main Backdrop**

**Adding an Image:**

1. Click **"Add"** in the Posters section.
2. An inline form expands.
3. **Select a file** — accepts JPEG, PNG, or WebP.
4. The system **auto-detects** whether it's a poster or backdrop based on dimensions (portrait = poster, landscape = backdrop).
5. Optionally fill in: Title, Description, Date.
6. Click **"Add to Gallery"**.
7. The image appears in the gallery with a pending badge (unsaved).

**Setting the Main Poster/Backdrop:**

- Click the **"Set as Main Poster"** or **"Set as Main Backdrop"** button on any image.
- The main poster is what users see in search results, movie cards, and lists.
- The main backdrop is the hero image on the movie detail page.

**Focal Point:**

- For posters and backdrops, you can set a **focal point** — the area of the image that should remain visible when cropped.
- A slider lets you adjust the focal point position.
- The preview panel shows exactly how the image will appear with your focal point setting.
- Click **"Reset to Center"** to restore the default centered crop.

**Removing an Image:**

- Click the **X** button on any image thumbnail to remove it from the gallery.

> **Image Storage:** All images are uploaded to Cloudflare R2 storage. Multiple size variants (\_sm, \_md, \_lg) are automatically generated. You never need to resize images manually.

---

#### Tab 3: Videos

Manage YouTube video links — trailers, teasers, behind-the-scenes content, songs, and more.

**Video Types Available:**
Teaser, Trailer, Glimpse, Song, Interview, Behind the Scenes (BTS), Event, Promo, Making, Other

**Adding a Video:**

1. Click **"Add"** in the Videos section.
2. Paste a **YouTube URL** (e.g., `https://www.youtube.com/watch?v=abc123`) — the YouTube ID is extracted automatically.
3. Enter a **Title** (required).
4. Select a **Video Type** (required).
5. Optionally add a Description and Date.
6. Click **"Add Video"**.

**Removing a Video:**

- Click the **X** button next to any video entry.

> **Note:** If the movie was imported from TMDB, trailers and teasers are already linked. You can add additional videos (songs, interviews, behind-the-scenes) manually.

---

#### Tab 4: Cast & Crew

This tab has two sub-sections: **Production Houses** and **Cast & Crew**.

##### Production Houses

Link the movie to its production and distribution companies.

**Adding a Production House:**

1. Start typing in the **search dropdown** — it searches existing production houses.
2. Select from the results.
3. The production house appears in the list with its logo.

**Quick-Creating a Production House:**
If the production house doesn't exist yet:

1. Type the name in the search dropdown.
2. When no results appear, click **"Create '[name]'"**.
3. A new production house is created with just the name (you can add a logo later from the Production Houses page).

**Removing a Production House:**

- Click the **X** button next to any production house entry.

##### Cast & Crew

Manage the movie's actors and technical crew.

**The interface shows two separate lists:**

- **Cast** — Actors with their character names
- **Crew** — Technicians with their role titles

**Adding a Cast Member:**

1. Toggle to **"Cast (Actor)"** mode.
2. Start typing an actor's name in the search dropdown (minimum 2 characters).
3. Select the actor from results.
4. Optionally enter a **Character Name** (e.g., "Arjun Reddy").
5. Click **"Add"**.

**Adding a Crew Member:**

1. Toggle to **"Crew (Technician)"** mode.
2. Search for the person.
3. Select a **Role** from the hierarchy:
   - 1 = Director
   - 2 = Producer
   - 3 = Music Director
   - 4 = Director of Photography (DOP)
   - 5 = Editor
   - 6 = Art Director
   - 7 = Stunt Choreographer
   - 8 = Choreographer
   - 9 = Lyricist
4. Click **"Add"**.

**Quick-Creating an Actor/Technician:**
If the person doesn't exist, click **"Create '[name]'"** in the search dropdown. They'll be created with just a name — you can add their photo, bio, and other details later from the Cast page.

**Reordering:**

- **Drag and drop** cast and crew members to change their billing order.
- Use the grip handle (≡) on the left side of each entry to drag.
- Cast is always displayed before crew.

**Removing:**

- Click the **X** button next to any cast/crew entry.

> **Note:** A person can appear in both cast AND crew (e.g., an actor who also directed the film). They can also have multiple crew roles (Director + Writer).

---

#### Tab 5: Releases

This tab manages two types of releases: **Theatrical Runs** and **OTT Platforms**.

##### Theatrical Runs

Track when and where the movie is/was in cinemas.

**Adding a Theatrical Run:**

1. Click **"Add Run"**.
2. Set the **Release Date** (required) — the date the movie entered/will enter theaters.
3. Optionally set an **End Date** — when the theatrical run ended.
4. Optionally set a **Label** — e.g., "Re-release", "Director's Cut". Defaults to "Original".
5. Click **"Add"**.

**Ending a Run:**

- Click **"End Run"** to set the end date to today.

**Removing a Run:**

- Click the **X** button to remove a theatrical run entry.

> **Validation:** No two theatrical runs can have the same release date.

##### OTT Platforms (Streaming Availability)

This is where you manage which streaming services have the movie, in which countries, and what type of availability.

**How it's organized:**

- A **Country dropdown** at the top lets you view/manage availability per country.
- Each country shows platforms grouped by **availability type**:
  - **Stream** (flatrate subscription — e.g., Netflix, Prime)
  - **Rent** (pay-per-view rental)
  - **Buy** (digital purchase)
  - **Free with Ads** (ad-supported streaming)
  - **Free** (free without ads)

**Adding a Country:**

1. Click **"Add Country"**.
2. Search for and select the country.
3. The country tab appears — now add platforms within it.

**Adding a Platform to a Country:**

1. Select the country tab.
2. In the appropriate availability section (Stream, Rent, Buy, etc.), click **"Add Platform"**.
3. Select from platforms available in that country (filtered by the platform's registered regions).
4. Optionally set an **Available From** date.
5. Optionally add a **Streaming URL** (direct link to the movie on that platform).

**Removing a Platform:**

- Click the **X** button next to any platform entry.

> **Important:** OTT changes save immediately (not via the dock). Each add/remove is committed as you do it.

---

#### Tab 6: TMDB Sync (Edit Page Only)

This tab only appears on the edit page when the movie has a TMDB ID linked. It lets you compare your movie's data against the latest TMDB data and selectively update specific fields.

**How it works:**

1. When you open this tab, the system fetches the latest data from TMDB for this movie.
2. A **field-by-field comparison table** appears showing your current data alongside TMDB's data.
3. Each field is color-coded:
   - **Missing** (green) — your database is empty but TMDB has a value. These are pre-checked for you.
   - **Changed** (amber) — both have values but they differ. These are unchecked by default — review before overwriting.
   - **Same** (gray) — already up to date. Cannot be selected.
4. Check the fields you want to update from TMDB.
5. Optionally check **"Re-sync cast & crew"** to perform a full cast refresh.
6. Click **"Apply N selected fields"** to update only the selected fields.

> **Tip:** This is the same field-diff interface used in the Discover tab's existing movies section (see §6), but scoped to a single movie.

---

### The Changes Dock

Whenever you modify any field on the movie edit page, a **dock appears at the bottom** of the screen.

**What the dock shows:**

- A pulsing amber dot indicating "Unsaved changes"
- A numbered badge showing how many fields changed
- A scrollable list of every change: field name, old value → new value
- **Revert** button per field (undo just that one change)
- **Discard** button (undo ALL changes)
- **Save** button (commit all changes)

**Behavior:**

- The dock is **always visible** at the bottom — you never need to scroll to find it.
- If you change a field back to its original value, the change disappears from the dock.
- When all changes are reverted, the dock disappears.
- After saving, a brief "Saved" message appears in the dock, then it disappears.

> **Critical:** The dock captures ALL types of changes — text edits, dropdown selections, checkbox toggles, date changes, focal point adjustments, image selections, cast additions/removals, and video additions/removals.

### The Live Preview Panel

On the right side of the movie edit page, a **live preview** shows how the movie will look in the mobile app.

**Device Selector:** Choose from iPhone SE, iPhone 15, iPhone 15 Pro Max, or Pixel 8 to see how it looks on different screen sizes.

**View Toggle:** Switch between **Spotlight** view (home screen card) and **Detail** view (full movie page).

The preview updates in real-time as you edit — change the title and it immediately appears in the preview. Select a new poster and the preview shows it instantly (even before saving).

### Deleting a Movie

Only Root and Super Admin can delete movies.

1. Open the movie edit page.
2. Click the **red trash icon** in the top-right header.
3. Confirm the deletion in the dialog.

> **Warning:** Deleting a movie is permanent. It removes the movie and ALL related data (cast links, images, videos, theatrical runs, OTT availability, reviews).

---

## 8. Artists (Cast & Crew)

Artists are the actors and technicians in the Faniverz system. The admin panel calls this section "Cast."

### Accessing Artists

Navigate to **Content → Cast** in the sidebar.

### The Cast List

A grid of cards showing all actors and technicians.

- Each card shows: **Photo** (circular), **Name**, **Type badge** (Actor or Technician)
- **Search:** Type at least 2 characters to filter by name.
- **Infinite scroll:** More actors load as you scroll down.
- **Actions per card:** Edit (pencil icon), Delete (trash icon — Root/Super Admin only)

### Adding a New Actor

#### Method 1: Import from TMDB (Recommended)

Go to the **Sync** page, search for the person, and click **"Import Actor"**. This pre-fills their name, photo, biography, birth date, place of birth, and gender.

#### Method 2: Manual Creation

1. Click **"Add Actor"** on the cast list page.
2. An inline form appears with these fields:

| Field             | Type        | Required | Description                                 |
| ----------------- | ----------- | -------- | ------------------------------------------- |
| **Name**          | Text        | Yes      | Full name                                   |
| **Photo**         | File upload | No       | Profile photo (JPEG, PNG, or WebP, max 5MB) |
| **Person Type**   | Dropdown    | No       | Actor or Technician (defaults to Actor)     |
| **Date of Birth** | Date picker | No       | Birth date                                  |
| **Height (cm)**   | Number      | No       | Height in centimeters                       |

3. Click **"Create"** to save.

### Editing an Actor

Click the **edit (pencil) icon** on any actor card to open the edit page.

#### Edit Page Layout

Similar to the movie edit page — form on the left, live preview on the right.

**Editable Fields:**

| Field              | Type            | Description                                 |
| ------------------ | --------------- | ------------------------------------------- |
| **Name**           | Text (required) | Full display name                           |
| **Photo**          | File upload     | Upload, change, or remove the profile photo |
| **Person Type**    | Dropdown        | Actor or Technician                         |
| **Date of Birth**  | Date picker     | Birth date                                  |
| **Gender**         | Dropdown        | Not set, Female, Male, or Non-binary        |
| **Height (cm)**    | Number          | Height in centimeters                       |
| **TMDB Person ID** | Number          | Links to TMDB for syncing                   |
| **Place of Birth** | Text            | Birthplace                                  |
| **Biography**      | Textarea        | Life/career biography                       |

#### The Preview Panel

Shows a mobile-style preview of the actor's detail page:

- Circular avatar (120px)
- Name in bold
- Type and gender badges
- Bio info card (birth date, birthplace, height)
- Biography text (clamped to 4 lines with "Read more")
- Filmography section placeholder

#### Changes Dock

Same behavior as the movie edit page — shows pending changes, individual revert, save/discard.

### Refreshing an Actor from TMDB

If an actor has a TMDB Person ID:

1. Go to the **Sync** page.
2. Search for the actor.
3. Click their card → **"Refresh from TMDB"**.
4. Only changed fields are updated — your manual edits to unchanged fields are preserved.

### PH Admin Restrictions

If you're a Production House Admin:

- You can only edit actors **you created** (tracked by the `created_by` field).
- You can see all actors in the grid but can only click edit on your own.

---

## 9. Production Houses

Production houses are the studios, production companies, and distribution companies behind movies.

### Accessing Production Houses

Navigate to **Content → Production Houses** in the sidebar.

### The Production Houses List

A grid of cards with:

- **Logo** (or a building icon if no logo)
- **Name**
- **Country** (with flag emoji)

**Filtering:**

- **Country dropdown:** Filter by country. Shows all countries that have at least one production house, plus "All Countries" and "Not Set" (for houses without a country).
- **Search:** Type at least 2 characters to search by name.
- **Infinite scroll** for large lists.

### Adding a Production House

1. Click **"Add Production House"** — a modal form appears.
2. Fill in:
   - **Name** (required)
   - **Logo** (file upload)
   - **Description** (optional)
   - **Country** (dropdown with flag emojis)
3. Click **"Create"**.

### Editing a Production House

Click the edit icon on any card to open the edit page.

**Editable Fields:**

| Field           | Type            | Description                                  |
| --------------- | --------------- | -------------------------------------------- |
| **Name**        | Text (required) | Company name                                 |
| **Logo**        | File upload     | Company logo (upload/change/remove)          |
| **Description** | Textarea        | About the company                            |
| **Country**     | Dropdown        | Country of origin (read-only if TMDB-linked) |

**TMDB Metadata:** If the production house was imported from TMDB, you'll see the TMDB Company ID and original country as read-only badges.

**Changes Dock:** Same dock behavior — shows pending changes, save/discard.

### PH Admin Behavior

If you're a Production House Admin, you only see production houses you've been assigned to. You cannot edit production houses outside your assignment.

---

## 10. OTT Platforms

OTT Platforms represent streaming services (Netflix, Prime Video, Aha, Hotstar, etc.) with multi-region support.

### Accessing OTT Platforms

Navigate to **Content → OTT Platforms** in the sidebar.

### The Platform List

- **Country selector** at the top (defaults to India). Only shows countries that have at least one platform.
- Grid of platform cards showing: logo, name.
- Platforms are filtered by their `regions` array — a platform appears in a country if that country is in its regions list.

### Adding a New Platform

1. Click **"Add Platform"**.
2. Fill in:
   - **Name** (required)
   - **Logo** (file upload — PNG recommended)
   - **TMDB Provider ID** (optional — enables automatic sync of streaming data)
   - **Countries** (multi-select — which countries this platform operates in)
3. Click **"Create"**.

> **Note:** The platform ID is auto-generated as a slug (e.g., "netflix-a7k2").

### Editing a Platform

Click a platform card to open the edit page.

**Editable Fields:**

| Field                | Type               | Description                          |
| -------------------- | ------------------ | ------------------------------------ |
| **Name**             | Text (required)    | Platform display name                |
| **Logo**             | File upload        | Platform logo                        |
| **TMDB Provider ID** | Number             | Links to TMDB for automatic OTT sync |
| **Countries**        | Multi-select chips | Which countries this platform covers |

**Managing Countries:**

- Countries appear as removable chips.
- Click **"Add Country"** to open a searchable picker.
- Click the **X** on any chip to remove a country.
- A platform must have at least one country.

### How Platforms Connect to Movies

When you sync a movie's watch providers from TMDB, the system automatically:

1. Matches TMDB provider IDs to our platform records.
2. Creates new platform entries for unrecognized providers.
3. Links movies to platforms with country-specific availability.

You can also manually add OTT availability from the movie edit page's **Releases → OTT Platforms** tab.

---

## 11. In Theaters — Managing Theatrical Runs

The "In Theaters" page is a unique batch-save interface for managing which movies are currently showing in cinemas.

### Accessing In Theaters

Navigate to **Content → In Theaters** in the sidebar.

### The Two-Column Layout

```
┌─────────────────────┬─────────────────────┐
│    IN THEATERS      │      UPCOMING       │
│                     │                     │
│  [Movie A] ⬤ ON    │  [Movie D] ○ OFF    │
│  [Movie B] ⬤ ON    │  [Movie E] ○ OFF    │
│  [Movie C] ⬤ ON    │  [Movie F] ○ OFF    │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

- **Left column ("In Theaters"):** Movies currently in cinemas. Each has a toggle that's ON.
- **Right column ("Upcoming"):** Movies with future release dates not yet in theaters. Each has a toggle that's OFF.

### Toggling Movies

- **Toggle a movie OFF** (In Theaters → Upcoming): The movie moves to the pending changes list. It will be removed from theaters when you save.
- **Toggle a movie ON** (Upcoming → In Theaters): The movie moves to the pending changes list. It will be marked as "in theaters" when you save. You can optionally set:
  - A **release date** (or update the existing one)
  - A **premiere date**
  - A **label** (e.g., "Re-release")

### The Pending Changes Dock

As you toggle movies, a **dock appears at the bottom** showing all pending changes:

- Each entry shows: movie poster + title + what's changing
- **Save Changes** button commits ALL pending changes at once
- **Discard** button reverts everything

> **Important:** Changes are NOT saved immediately when you toggle. You MUST click "Save Changes" to commit.

### Adding a Movie Not in the List

If a movie isn't showing in either column:

1. Click **"Add Movie"** to open the manual add panel.
2. Search for the movie by title.
3. Set the release date and optional label.
4. Click **"Add"** — it appears in the pending changes.

### How It Connects

When you save:

1. Movies toggled ON get `in_theaters = true` in the database.
2. A new `theatrical_run` record is created with the start date.
3. Movies toggled OFF get `in_theaters = false`.
4. Their current theatrical run gets an end date (today).

The mobile app uses this data to show "In Theaters" badges and the "In Theaters" section on the home screen.

---

## 12. Surprise Content

Surprise Content is special video content — songs, short films, behind-the-scenes footage, interviews, and trailers that aren't tied to a specific movie's page.

### Accessing Surprise Content

Navigate to **Content → Surprise Content** in the sidebar.

### The Surprise Content List

A flat table showing all surprise content items:

| Column       | Description                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Title**    | Content title                                                                                      |
| **Category** | Color-coded badge: Song (pink), Short Film (purple), BTS (yellow), Interview (blue), Trailer (red) |
| **Views**    | View count (read-only, tracked by the mobile app)                                                  |
| **Actions**  | Edit and Delete buttons                                                                            |

### Creating Surprise Content

1. Click **"Add Content"**.
2. Fill in:
   - **Title** (required)
   - **Category** (select): Song, Short Film, BTS, Interview, Trailer
   - **Description** (optional)
   - **YouTube ID** (required — the video identifier from a YouTube URL)
   - **Views** (number, defaults to 0 — can be set for imported content with existing view counts)
3. Click **"Create"**.

### Editing Surprise Content

Click the edit button to open the edit page with the same fields. Changes are tracked by the dock.

---

## 13. News Feed

The Feed page manages admin-created posts that appear in the mobile app's news feed — movie updates, trailer drops, poster reveals, and announcements.

### Accessing News Feed

Navigate to **Content → News Feed** in the sidebar.

### The Feed List

- **Type filter:** All, Update, Video, Poster
- Feed items displayed as a **drag-and-drop reorderable list**.
- Each item shows: title, type badge, description snippet, pin/feature toggles.
- A **mobile preview** on the right shows how the feed looks in the app.

### Reordering Feed Items

**Drag and drop** items to change their order:

1. Grab the grip handle (≡) on any item.
2. Drag it to the desired position.
3. The order is saved immediately.

### Creating a Feed Post

1. Click **"Add Update"**.
2. Select **Feed Type**:
   - **Update** — text announcement
   - **Video** — YouTube video embed
   - **Poster** — image post
3. Select **Content Type** (varies by feed type):
   - Update: [update]
   - Video: trailer, teaser, glimpse, song, bts, interview, event, promo, making
   - Poster: [poster]
4. Fill in:
   - **Title** (required)
   - **Description** (optional)
   - **YouTube ID** (for video type — paste URL, ID is extracted)
   - **Thumbnail** (for update/poster type — upload an image)
5. Toggle options:
   - **Pin to Top** — keeps this post at the top of the feed
   - **Featured** — highlights with special styling
6. Click **"Create"**.

### Editing a Feed Post

Click the edit button on any feed item to open the edit page. The edit page shows the feed type, content type, movie association, and YouTube video or thumbnail as **read-only** information at the top.

**Editable fields on the edit page:**

- **Title** (required)
- **Description** (optional)
- **Pin to Top** (checkbox)
- **Featured** (checkbox)

> **Note:** Feed type, content type, YouTube ID, and thumbnail cannot be changed after creation. If a post was auto-generated from a movie or other source, a banner at the top indicates this.

Changes are tracked by the dock for save/discard.

---

## 14. Reviews & Comments — Moderation

### Reviews

Navigate to **Moderation → Reviews** in the sidebar.

**The Reviews Table:**

| Column      | Description                                      |
| ----------- | ------------------------------------------------ |
| **Movie**   | Movie title the review is for                    |
| **User**    | Reviewer's display name                          |
| **Rating**  | 1-5 stars (filled/unfilled)                      |
| **Review**  | Title + body text, with spoiler badge if flagged |
| **Date**    | When the review was submitted                    |
| **Actions** | Edit (pencil) and Delete (trash)                 |

**Searching:** Search by movie name, reviewer name, or review text.

**Rating Filter:** Filter by star count (1-5) or show all.

**Inline Editing:**

1. Click the **pencil icon** on any review.
2. The review text becomes an editable textarea.
3. Modify the text.
4. Click **Save** or **Cancel**.

> **Note:** Only one review can be in edit mode at a time.

**Deleting a Review:**

- Click the trash icon and confirm. Deletion is permanent.

### Comments

Navigate to **Moderation → Comments** in the sidebar.

Identical pattern to Reviews:

- Table with: Post title, User, Comment text, Date, Actions
- Search by comment text or commenter name
- Inline editing (one at a time)
- Delete with confirmation

> **Note:** If the original feed post was deleted, the comment shows a fallback text instead of the post title.

---

## 15. Notifications

Manage push notifications sent to app users.

### Accessing Notifications

Navigate to **Content → Notifications** in the sidebar. (Or directly via the sidebar.)

### The Notification Queue

A table of all notifications with filters:

**Status Filter:** Pending, Sent, Failed, Cancelled

**Type Filter:** Release, Watchlist, Trending, Reminder

| Column            | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| **Type**          | Badge (Release=purple, Watchlist=blue, Trending=orange, Reminder=green) |
| **Title**         | Notification title                                                      |
| **Status**        | Current status badge                                                    |
| **Scheduled For** | When the notification is/was scheduled to send                          |
| **Actions**       | Cancel (pending) or Retry (failed)                                      |

### Notification Lifecycle

```
Pending → Sent (success)
Pending → Failed (error)
Pending → Cancelled (admin action)
Failed → Pending (retried by admin)
```

### Bulk Actions

- **"Retry All Failed"** — Sets all failed notifications back to pending for re-processing.
- **"Cancel All Pending"** — Cancels all pending notifications (irreversible).

Both require confirmation before executing.

### Composing a Notification

1. Click **"Compose"** or navigate to `/notifications/compose`.
2. An info banner reminds you: "Push notifications sent via send-push edge function."
3. Fill in the compose form:
   - Select a movie (optional — for movie-related notifications)
   - Enter notification title and body
   - Select notification type
   - Set scheduled time
4. Click **"Send"**.
5. On success, you're redirected to the notification queue.

---

## 16. App Users

Manage the end users of the Faniverz mobile app.

### Accessing App Users

Navigate to **System → App Users** in the sidebar.

### The Users Table

**Server-side pagination** with 50 users per page.

| Column       | Description                                    |
| ------------ | ---------------------------------------------- |
| **User**     | Avatar (with initials fallback) + display name |
| **Username** | Unique username                                |
| **Email**    | Email address                                  |
| **Joined**   | Registration date                              |
| **Actions**  | Edit (pencil), Ban (shield icon)               |

**Search:** Search by name, username, or email. Resets to page 1 on new search.

**Pagination:** Page controls at the bottom (Previous, page numbers, Next).

### Editing a User

Click the pencil icon:

1. The **display name** field becomes editable.
2. Modify the display name.
3. Click **Save** or **Cancel**.

> **Note:** Only one user can be in edit mode at a time. Only the display name can be edited — username, email, and other profile data are not exposed.

### Banning a User

1. Click the **Ban** button (shield icon).
2. Confirm: "Ban [name]? They will not be able to log in."
3. The user is banned (10-year ban duration via Supabase Auth).

> **Warning:** There is no unban button on this page. To unban a user, contact a developer.

---

## 17. Admin Management

Manage other admin panel users — invite new admins, assign roles, block/unblock, and impersonate.

### Accessing Admin Management

Navigate to **System → Users** in the sidebar. (Only visible to users with admin management permissions.)

### Two Tabs

#### Tab 1: Admins

**Status Filter:** Active, Blocked, All

**Table Columns:**

| Column                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| **User**              | Avatar + name + email                                  |
| **Role**              | Current role (dropdown to change for manageable roles) |
| **Status**            | Active (green) or Blocked (red) badge                  |
| **Production Houses** | Assigned PHs (only shown for PH Admin role)            |
| **Languages**         | Assigned languages (only shown for Admin role)         |
| **Since**             | When the role was assigned                             |
| **Actions**           | Impersonate, Block/Unblock, Revoke                     |

**Hierarchy Rules:**

- You can only see and manage users at your role level and below.
- Root sees everyone. Super Admin sees all except Root. Admin sees PH Admins and Viewers only.

**Changing a Role:**

1. Click the role dropdown on any user row.
2. Select the new role (you can only assign roles below your own).
3. Confirm the change.

**Assigning Languages** (Admin role only):

- When a user has the Admin role, checkboxes appear for each available language.
- Check/uncheck languages to control which content they can see and edit.
- Only Root and Super Admin can assign languages.

**Blocking an Admin:**

1. Click the **Block** button.
2. Enter a **mandatory reason** (e.g., "Extended leave" or "Policy violation").
3. Confirm.
4. The user is immediately blocked and sees an "Access Blocked" screen with your reason.

**Unblocking:**

- Click **Unblock** on a blocked user to restore their access.

**Self-Protection:** You cannot block yourself, revoke your own access, or change your own role.

**Minimum Protection:** The system prevents you from blocking or revoking the last active Root or the last active Super Admin — there must always be at least one of each.

**Revoking Access:**

- Click **Revoke** to permanently remove someone's admin role.
- This is irreversible from the admin panel.

#### Tab 2: Invitations

Shows pending admin invitations that haven't been accepted yet.

| Column         | Description                                   |
| -------------- | --------------------------------------------- |
| **Email**      | Invited email address                         |
| **Role**       | Assigned role                                 |
| **Invited By** | Who sent the invitation                       |
| **Expires**    | Invitation expiry date (7 days from creation) |

### Inviting a New Admin

1. Click **"Invite Admin"** (only visible to Super Admins and above).
2. Enter the **email address** of the person you want to invite.
3. Select their **role**:
   - Super Admin, Admin, Production House Admin, or Viewer
   - You can only invite roles below your own.
4. If the role is **Production House Admin**, checkboxes appear for production house assignments. Select which production houses they should manage.
5. Click **"Send Invitation"**.
6. A unique invitation link is generated (valid for 7 days).
7. Share this link with the invitee — when they click it and sign in with Google, their admin account is automatically activated.

### Impersonation

Impersonation lets Super Admins and Root users test the panel as if they were a different user or role.

**How to Start:**

1. Open your user menu (top-right) → click **"Impersonate"**.
2. Select a target role (Admin, PH Admin, Viewer).
3. The panel immediately switches to that role's view — sidebar items change, permissions change.

**Or impersonate a specific user:**

1. In the Admins table, click the **eye icon** on any user.
2. The panel switches to that user's exact view — their assigned languages, production houses, and role.

**Visual Indicator:**

- A **gold/amber bar** appears at the top of the page: "Impersonating: [Name] ([Role])"
- Click **"Stop"** on this bar to return to your real identity.

**Safety:**

- You cannot impersonate someone with a higher role than yours.
- All actions during impersonation are logged under YOUR real identity in the audit log.
- Impersonation persists across page refreshes (stored in the database).

---

## 18. Audit Log

A comprehensive record of every action performed in the admin panel.

### Accessing the Audit Log

Navigate to **System → Audit Log** in the sidebar.

### What Gets Logged

Every create, update, delete, and sync action is automatically recorded. You don't need to do anything — the audit trail is generated by database triggers.

### The Audit Table

| Column          | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| **Admin**       | Who performed the action (shows real user even during impersonation) |
| **Action**      | Create, Update, Delete, or Sync                                      |
| **Entity Type** | Movies, Actors, Platforms, etc.                                      |
| **Entity Name** | Human-readable name (not a UUID)                                     |
| **Timestamp**   | When it happened                                                     |

### Filtering

- **Search:** By admin email, entity type, or entity name (minimum 2 characters).
- **Action dropdown:** Create, Update, Delete, Sync, or All.
- **Entity Type dropdown:** Movies, Actors, Platforms, etc.
- **Date range:** From date and/or To date.

### Expanding Details

Click on any row to expand it and see:

- **For updates:** A JSON diff showing exactly what changed (old value → new value).
- **For creates:** The full data that was created.
- **For deletes:** The data that was removed.

### Reverting Changes

If a change was made in error:

1. Expand the audit entry.
2. Click **"Revert"** — this undoes the change (creates a new audit entry recording the revert).
3. Reverted entries are marked with "Reverted on [timestamp]".
4. You cannot re-revert (the revert button disappears after use).

> **Note:** Only Super Admins and Root can revert changes.

### Visibility

- **Root and Super Admin:** See all audit entries across all users.
- **All other roles:** See only their own audit entries.

### Impersonation Tracking

When an action was performed during impersonation, the audit entry shows both:

- The **real admin** who performed the action
- The **impersonated user/role** (displayed as an "as [Role]" badge)

---

## 19. Validations — Image Health Checks

The Validations page scans the database for image issues — broken URLs, missing variants, and external URLs that should be migrated to our storage.

### Accessing Validations

Navigate to **System → Validations** in the sidebar.

### Summary Panel

Shows issue counts by entity type (movies, actors, platforms, etc.) at a glance.

### Running a Scan

**Quick Scan:** Checks the database for null URLs and missing image references. Fast but doesn't verify actual file existence.

**Deep Scan:** Makes actual HTTP requests to verify each image and its variants (sm, md, lg) exist in storage. Slower but comprehensive.

### Scan Results

After scanning, a table shows:

| Column         | Description                                    |
| -------------- | ---------------------------------------------- |
| **Entity**     | What type of record has the issue              |
| **ID**         | Record identifier                              |
| **Field**      | Which field has the problem (e.g., poster_url) |
| **Issue Type** | Missing variant, external URL, null reference  |
| **Action**     | Fix button                                     |

### Fixing Issues

**Individual fix:** Click the **"Fix"** button on any row.

**Bulk fix:**

1. Select issues using checkboxes (or "Select All").
2. Click **"Fix Selected"**.
3. Progress indicator shows completion percentage.

**What fixing does:**

- **External URLs** → Downloads the image and re-uploads to our R2 storage.
- **Missing variants** → Regenerates size variants from the original image.
- **Null references** → Flagged for manual attention (can't auto-fix).

---

## 20. Profile Management

Manage your own admin profile photo.

### Accessing Your Profile

Click your avatar in the top-right header → select **"Profile"** from the dropdown.

### Three Options

1. **Change Photo** — Upload a custom profile photo.
2. **Remove Photo** — Clear your profile photo entirely (shows default initials).
3. **Reset to Google Avatar** — Restore your Google account's profile photo.

> **Note:** Your display name and email come from your Google account and cannot be changed in the admin panel.

---

## 21. Common Patterns You'll Use Every Day

### Pattern 1: The Daily Workflow

A typical day for a content editor:

```
1. Login → Dashboard (check stats)
2. Sync → Discover (import new releases for your language)
3. Movies → Edit imported movies (fix titles, add missing data, upload better posters)
4. In Theaters → Toggle newly-released movies ON
5. Feed → Create posts about new releases
6. Reviews/Comments → Moderate user submissions
```

### Pattern 2: Adding a Brand New Movie (End-to-End)

```
Step 1: Sync → Discover → Search for movie → Import
Step 2: Movies → Open the newly imported movie → Edit page
Step 3: Basic Info tab → Verify title, fix synopsis if needed, set language
Step 4: Posters tab → Check imported posters, upload better ones if available
Step 5: Videos tab → Add any missing trailers or song videos
Step 6: Cast & Crew tab → Verify cast/crew, add missing members, reorder
Step 7: Releases → Add theatrical run if in cinemas
Step 8: Releases → OTT → Add streaming platforms by country
Step 9: Save all changes
Step 10: Feed → Create a post announcing the new movie
```

### Pattern 3: Movie Goes to OTT

When a movie leaves theaters and arrives on a streaming platform:

```
Step 1: In Theaters → Toggle the movie OFF (ends theatrical run)
Step 2: Movies → Open the movie → Releases tab → OTT Platforms
Step 3: Select country (e.g., India)
Step 4: Add platform (e.g., Netflix) under "Stream"
Step 5: Set "Available From" date
Step 6: Optionally add streaming URL
Step 7: Feed → Create a post: "[Movie] now streaming on Netflix"
```

### Pattern 4: Keeping Data Fresh

```
Weekly:
  1. Sync → Check stale items (movies not synced in 30+ days)
  2. Refresh stale movies from TMDB
  3. Validations → Run a quick scan → Fix any image issues

Monthly:
  1. Sync → Bulk → Import any movies from the past month you might have missed
  2. Sync → Discover → Check for new actors missing biographies
  3. Import missing actor bios
```

### Pattern 5: Handling a Movie Announcement

When a new movie is announced but not yet released:

```
Step 1: Movies → Add Movie (manual, since TMDB may not have it yet)
Step 2: Enter: Title, language, expected release date (if known)
Step 3: Upload any available poster/first-look images
Step 4: Feed → Create announcement post
Step 5: Later, when TMDB adds the movie:
   - Sync → Search → Find the TMDB entry
   - Link the TMDB ID to your manually-created movie
   - Fill fields from TMDB (cast, crew, additional images)
```

### Pattern 6: Correcting Wrong Data

If a movie has incorrect information:

```
Option A — Manual Fix:
  1. Open the movie edit page
  2. Correct the fields
  3. Save

Option B — TMDB Override:
  1. Sync → Search → Find the movie
  2. Use "Fill Fields" with only the incorrect fields selected
  3. TMDB data replaces only what you selected
```

### The Unsaved Changes Warning

Whenever you have unsaved changes on any page, the system will warn you before you navigate away:

- Browser back button → confirmation dialog
- Clicking a sidebar link → confirmation dialog
- Closing the tab → browser's built-in "Leave site?" dialog
- Refreshing the page → browser's built-in "Leave site?" dialog

**Always save or discard your changes before leaving a page.**

---

## 22. Troubleshooting & FAQ

### Q: I imported a movie but some data is missing (no cast, no posters).

**A:** The import may have partially failed due to a timeout. Go to **Sync → History** and check the import status. If it shows errors, try re-importing the movie — the system uses additive operations, so it will pick up where it left off.

### Q: I changed a movie's poster but the mobile app still shows the old one.

**A:** The mobile app caches images. The change is in the database immediately, but users may see the old poster for up to an hour due to CDN caching.

### Q: I can't find a movie in the list even though I know it exists.

**A:** Check your **Language Switcher**. You may be filtering by a language that doesn't match the movie. Switch to "All" (if available) or the correct language. Also check if you have a status filter active.

### Q: The "Save" button is grayed out / I can't edit anything.

**A:** You likely have the **Viewer** role (read-only). Check with your admin to upgrade your role.

### Q: I accidentally deleted something. Can I undo it?

**A:** If you're a Super Admin or Root, go to **Audit Log**, find the delete entry, and click **"Revert"**. For other roles, contact a Super Admin.

### Q: An actor appears twice in the system.

**A:** One may have been manually created and the other imported from TMDB. Check if both have TMDB IDs. If only one does, the other is the duplicate — you'll need to reassign all their movie connections to the TMDB-linked version, then delete the duplicate.

### Q: I'm a PH Admin and I can't see some movies I expect to see.

**A:** You can only see movies linked to your assigned production houses. If a movie isn't linked to your production house yet, ask a Super Admin to add the link.

### Q: The sync is stuck or taking very long.

**A:** TMDB has rate limits (40 requests per 10 seconds). Large batch imports may take several minutes. Check **Sync → History** for status. If it shows "Running" for more than 10 minutes, there may be an issue — contact your technical team.

### Q: How do I change my admin role?

**A:** You cannot change your own role. Ask a Super Admin or Root user to change it from the **Admin Management** page.

---

## Appendix A — Keyboard Shortcuts & Tips

### Search Tips

- All search boxes require **minimum 2 characters** before results appear.
- Search is **case-insensitive**.
- In movie lists, searching **temporarily disables** the language filter so you can find movies across all languages.

### Form Tips

- **Tab** key moves between form fields.
- **Escape** key closes open dropdown menus.
- In actor/production house search dropdowns, use **Arrow Up/Down** to navigate results and **Enter** to select.
- Changing a field **back to its original value** automatically removes it from the unsaved changes dock.

### Navigation Tips

- The **breadcrumb trail** at the top always shows your current location — click any breadcrumb to jump back to that level.
- The sidebar can be **collapsed** for more screen space on smaller monitors.
- **Ctrl/Cmd + click** on a movie title opens it in a new tab (useful for editing multiple movies).

---

## Appendix B — Glossary

| Term                  | Definition                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| **TMDB**              | The Movie Database — our primary external source for movie metadata, images, and streaming data    |
| **R2**                | Cloudflare R2 — our image storage service where all posters, backdrops, and photos are kept        |
| **OTT**               | Over-The-Top — streaming platforms like Netflix, Prime, Aha that deliver content over the internet |
| **Theatrical Run**    | The period a movie is showing in cinemas, from release date to end date                            |
| **Flatrate**          | Subscription-based streaming (included with your platform subscription)                            |
| **Sync**              | The process of importing or refreshing data from TMDB into our system                              |
| **PH Admin**          | Production House Admin — an admin role scoped to specific production companies                     |
| **RBAC**              | Role-Based Access Control — the permission system that controls who can do what                    |
| **Dock**              | The bottom panel that appears when you have unsaved changes                                        |
| **Focal Point**       | The center of interest in an image, used to ensure important parts remain visible when cropped     |
| **Variants**          | Multiple sizes of the same image (sm, md, lg) auto-generated for performance optimization          |
| **Impersonation**     | Temporarily viewing the admin panel as if you were a different user/role                           |
| **CBFC**              | Central Board of Film Certification (India) — rates movies as U, UA, or A                          |
| **Slug**              | A URL-friendly version of a name (e.g., "netflix-a7k2")                                            |
| **Upsert**            | Update if exists, insert if new — the pattern used by sync to avoid duplicates                     |
| **Stale**             | A record that hasn't been synced with TMDB in a configurable number of days                        |
| **Additive Mode**     | Sync that only adds missing data without deleting existing records                                 |
| **Full-Replace Mode** | Sync that deletes and re-imports all data from TMDB                                                |

---

## Appendix C — Role Permission Matrix

### Page Access

| Page              | Root     | Super Admin  | Admin       | PH Admin           | Viewer           |
| ----------------- | -------- | ------------ | ----------- | ------------------ | ---------------- |
| Dashboard         | View     | View         | View        | View               | View (read-only) |
| Movies            | Full     | Full         | Create/Edit | Scoped Create/Edit | View only        |
| In Theaters       | Full     | Full         | Edit        | Edit (scoped)      | View only        |
| Cast              | Full     | Full         | Create/Edit | Create/Edit (own)  | View only        |
| Production Houses | Full     | Full         | Create/Edit | View (own)         | View only        |
| OTT Platforms     | Full     | Full         | Create/Edit | —                  | View only        |
| Surprise Content  | Full     | Full         | Create/Edit | —                  | View only        |
| News Feed         | Full     | Full         | Create/Edit | —                  | View only        |
| Reviews           | Full     | Full         | Edit/Delete | —                  | View only        |
| Comments          | Full     | Full         | Edit/Delete | —                  | View only        |
| Sync              | Full     | Full         | Full        | —                  | View only        |
| Audit Log         | View All | View All     | View Own    | View Own           | View Own         |
| Validations       | Full     | Full         | Full        | —                  | View only        |
| App Users         | Full     | Full         | Edit        | —                  | View only        |
| Admin Management  | Full     | Manage below | Limited     | —                  | —                |
| Notifications     | Full     | Full         | Full        | —                  | View only        |
| Profile           | Own      | Own          | Own         | Own                | Own              |

### Entity Operations

| Operation               | Root | Super Admin | Admin | PH Admin     | Viewer |
| ----------------------- | ---- | ----------- | ----- | ------------ | ------ |
| Create movie            | Yes  | Yes         | Yes   | Yes (scoped) | No     |
| Edit movie              | Yes  | Yes         | Yes   | Yes (scoped) | No     |
| Delete movie            | Yes  | Yes         | No    | No           | No     |
| Create actor            | Yes  | Yes         | Yes   | Yes          | No     |
| Edit actor              | Yes  | Yes         | Yes   | Own only     | No     |
| Delete actor            | Yes  | Yes         | No    | No           | No     |
| Add poster to movie     | Yes  | Yes         | Yes   | No           | No     |
| Remove poster           | Yes  | Yes         | Yes   | No           | No     |
| Add video to movie      | Yes  | Yes         | Yes   | No           | No     |
| Remove video            | Yes  | Yes         | Yes   | No           | No     |
| Add cast member         | Yes  | Yes         | Yes   | No           | No     |
| Remove cast member      | Yes  | Yes         | Yes   | No           | No     |
| Add OTT availability    | Yes  | Yes         | Yes   | No           | No     |
| Remove OTT availability | Yes  | Yes         | Yes   | No           | No     |
| Manage theatrical runs  | Yes  | Yes         | Yes   | Yes (scoped) | No     |
| Import from TMDB        | Yes  | Yes         | Yes   | No           | No     |
| Send notifications      | Yes  | Yes         | Yes   | No           | No     |
| Manage feed posts       | Yes  | Yes         | Yes   | No           | No     |
| Moderate reviews        | Yes  | Yes         | Yes   | No           | No     |
| Ban app users           | Yes  | Yes         | Yes   | No           | No     |
| Invite admins           | Yes  | Yes         | No    | No           | No     |
| Block/unblock admins    | Yes  | Yes         | No    | No           | No     |
| Impersonate             | Yes  | Yes         | No    | No           | No     |
| Revert audit entries    | Yes  | Yes         | No    | No           | No     |
| Run validations         | Yes  | Yes         | Yes   | No           | No     |

---

_This document covers every page, tab, field, and workflow in the Faniverz Admin Panel as of March 2026. For technical questions or access issues, contact your Super Admin or the development team._
