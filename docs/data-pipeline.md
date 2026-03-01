# Initial Database Population for Telugu Movies

## Context

The app schema is complete but the production database needs real Telugu movie data.
We need accurate release dates, posters, actors, crew, and OTT platform assignments.

No single source has everything. The best approach is a **multi-source pipeline**:

| Source                   | Strengths                                                                                              | Used for                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| **Wikipedia / Wikidata** | Comprehensive yearly lists of Telugu films, accurate Indian release dates, box office, production info | Movie discovery + release dates                 |
| **TMDB API**             | Posters, backdrops, actor photos, crew credits, trailers                                               | Media assets + cast/crew                        |
| **Admin panel**          | Full manual control                                                                                    | Certifications, featured flags, OTT assignments |

---

## Three-Track Strategy

| Track              | What                                                  | When                                     |
| ------------------ | ----------------------------------------------------- | ---------------------------------------- |
| **seed.sql**       | `supabase db reset` — 120 curated movies, 8 platforms | Dev / CI only                            |
| **Sync pipeline**  | Edge functions + enrichment scripts auto-import data  | Production initial load + weekly updates |
| **Admin curation** | Manual CRUD for certifications, featured, OTT         | Ongoing                                  |

---

## Data Pipeline: Step by Step

### Step 1 — Discover movies via Wikipedia/Wikidata

Wikipedia publishes yearly Telugu film lists at predictable URLs:

```
https://en.wikipedia.org/wiki/List_of_Telugu_films_of_2024
https://en.wikipedia.org/wiki/List_of_Telugu_films_of_2025
```

Each page has a table with: Title, Director, Producer, Music director, Release date.

**Better approach — Wikidata SPARQL** (structured, no HTML parsing):

```sparql
SELECT ?film ?filmLabel ?releaseDate ?directorLabel WHERE {
  ?film wdt:P31 wd:Q11424.          # instance of film
  ?film wdt:P364 wd:Q36236.         # original language = Telugu
  ?film wdt:P577 ?releaseDate.
  ?film wdt:P57 ?director.
  FILTER(YEAR(?releaseDate) >= 2022)
}
ORDER BY ?releaseDate
```

Wikidata endpoint: `https://query.wikidata.org/sparql`

**Output of Step 1**: list of (title, release_date, director_name, wikidata_id)

---

### Step 2 — Match each movie to TMDB

For each Wikipedia/Wikidata movie, call TMDB search:

```
GET /search/movie?query={title}&language=te&year={year}
```

Fallback: search by English title if Telugu doesn't return results.

Take the best match (highest TMDB popularity score for the correct year).

**Output of Step 2**: `wikidata_id → tmdb_id` mapping

---

### Step 3 — Enrich from TMDB

For each matched movie:

```
GET /movie/{tmdb_id}?append_to_response=credits,videos
```

Extract and store images in **Cloudflare R2** (not hotlinked from TMDB):

- Fetch `poster_path` → download → upload to `faniverz-movie-posters/{id}.jpg` → store R2 URL
- Fetch `backdrop_path` → download → upload to `faniverz-movie-backdrops/{id}.jpg` → store R2 URL
- For each actor: fetch `profile_path` → upload to `faniverz-actor-photos/{actor_id}.jpg`
- `trailer_url` (YouTube official trailer — stored as YouTube URL, not proxied)
- `synopsis`, `genres`, `runtime`
- Cast: top 15 actors (name, character)
- Crew: Director, Producer, Music Director, DOP, Editor

Image upload is handled by `scripts/lib/storage.ts` → `uploadImageFromUrl()`.
If R2 credentials are absent (local dev), the TMDB URL is stored as-is.

**Output of Step 3**: fully enriched movie row + actor/crew rows, all images on R2

---

### Step 4 — Upsert into Supabase

For each enriched movie:

1. Upsert `movies` — use `tmdb_id` as conflict key; fallback to title+release_date if no TMDB match
2. Upsert `actors` — keyed on `tmdb_person_id`; `person_type` inferred
3. Upsert `movie_cast` — keyed on `(movie_id, actor_id)`
4. Log to `sync_logs`

---

## What gets set automatically vs manually

| Field                                   | Auto (sync)                | Manual (admin)   |
| --------------------------------------- | -------------------------- | ---------------- |
| `title`                                 | Wikipedia + TMDB           | —                |
| `release_date`                          | Wikipedia (preferred)      | —                |
| `poster_url`, `backdrop_url`            | TMDB                       | —                |
| `trailer_url`                           | TMDB (YouTube)             | —                |
| `synopsis`, `runtime`, `genres`         | TMDB                       | —                |
| `director` (text column)                | Wikidata + TMDB credits    | —                |
| `release_type`                          | Computed from release_date | Override OTT     |
| `certification`                         | —                          | U / UA / A       |
| `is_featured`                           | —                          | Toggle in admin  |
| Actor `name`, `photo_url`, `birth_date` | TMDB                       | —                |
| Actor `person_type`                     | Inferred from TMDB dept    | —                |
| `movie_platforms` (OTT links)           | —                          | Admin movie edit |

---

## Implementation

### Option A — Supabase Edge Function (`sync-telugu-movies`)

Best for **ongoing, automated** updates (weekly cron).

**Files to create:**

- `supabase/functions/sync-telugu-movies/index.ts` — main orchestrator
- `supabase/functions/_shared/tmdb-types.ts` — TMDB TypeScript types
- `supabase/functions/_shared/wikidata.ts` — Wikidata SPARQL client

**Environment secrets needed:**

- `TMDB_API_KEY` — free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

**Admin Sync page** (already built at `/sync`) adds a "Sync Telugu Movies" button.

---

### Option B — One-time Node.js script (faster to ship for initial load)

Good for **bootstrapping production** before edge function is built.

**File:** `scripts/seed-telugu-movies.ts`

Run with:

```bash
TMDB_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
  npx tsx scripts/seed-telugu-movies.ts --year 2022 --year 2023 --year 2024 --year 2025
```

Same logic as the edge function but runs locally and can be inspected/debugged more easily.

---

## Actor `birth_date` enrichment (separate pass)

TMDB's `/person/{id}` endpoint has birthday. A second script/function can backfill this:

```
GET /person/{tmdb_person_id}
→ actors.birth_date
```

This is only needed for the Cast tab sorting (older actor shown first within same tier).
Run once after initial seed, then on each new actor upserted.

---

## TMDB → Schema Mapping

### Movies

| TMDB field          | Our column        | Notes                                              |
| ------------------- | ----------------- | -------------------------------------------------- |
| `id`                | `tmdb_id`         | conflict key                                       |
| `title`             | `title`           | prefer Telugu Wikipedia title if available         |
| `poster_path`       | `poster_url`      | prefix `https://image.tmdb.org/t/p/w500`           |
| `backdrop_path`     | `backdrop_url`    | prefix `https://image.tmdb.org/t/p/original`       |
| `release_date`      | `release_date`    | Wikipedia date preferred (more accurate for India) |
| `runtime`           | `runtime`         | minutes                                            |
| `genres[].name`     | `genres` (text[]) | map to our genre list                              |
| `overview`          | `synopsis`        |                                                    |
| YouTube trailer key | `trailer_url`     | `https://youtube.com/watch?v={key}`                |
| Computed            | `release_type`    | 'upcoming' if future, 'theatrical' otherwise       |

### Crew → `credit_type='crew'` + `role_order`

| TMDB job                      | `role_name`             | `role_order` |
| ----------------------------- | ----------------------- | ------------ |
| Director                      | Director                | 1            |
| Producer / Executive Producer | Producer                | 2            |
| Original Music Composer       | Music Director          | 3            |
| Director of Photography       | Director of Photography | 4            |
| Editor                        | Editor                  | 5            |

All crew → `person_type='technician'`

### Cast → `credit_type='cast'`

- `person_type='actor'`
- `role_name` = character name from TMDB
- top 15 by TMDB `order` field

---

## Recommended implementation order

1. **Start with the Node.js script** (Option B) — easier to test locally, see output, debug TMDB/Wikidata responses
2. Once it works, **port to the Edge Function** (Option A) for scheduled/admin-triggered runs
3. **Run actor birthday enrichment** after initial seed

---

## Verification

1. Run script for 2024 → check `movies` table in Supabase Studio
2. Open Movies list in admin → Telugu films appear with posters + release dates
3. Open a movie's Cast tab in the app → actors and crew listed
4. Compare release dates to Wikipedia page — should match
