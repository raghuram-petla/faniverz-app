# Scripts

One-time and maintenance scripts for the Faniverz backend. All scripts are run with `npx tsx` and require environment variables for Supabase and R2 access.

## backfill-image-variants.ts

Ensures every R2 image has `_sm`, `_md`, `_lg` resized variants. All image upload routes and sync routes already generate variants on upload, but images migrated by older scripts may only have the original.

**When to run:** Once after deploying the variant-aware components. Safe to re-run — it skips images that already have variants.

**How it works:**

1. Lists all objects in each R2 bucket once (paginated `ListObjectsV2`) and builds an in-memory index
2. Queries each DB table for non-null image URLs
3. For each R2 URL, checks the index for `{key}_sm.{ext}` — if present, skips (no network call)
4. Only images missing variants are downloaded, resized with Sharp, and re-uploaded

This means re-runs are very fast: the only network cost is the bucket listing + DB query. No per-image HEAD requests.

**Required env vars:**

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# R2 credentials
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx

# R2 public bucket URLs (one per image type)
R2_PUBLIC_BASE_URL_POSTERS=https://pub-aaa.r2.dev
R2_PUBLIC_BASE_URL_BACKDROPS=https://pub-bbb.r2.dev
R2_PUBLIC_BASE_URL_ACTORS=https://pub-ccc.r2.dev
R2_PUBLIC_BASE_URL_AVATARS=https://pub-ddd.r2.dev
R2_PUBLIC_BASE_URL_PLATFORMS=https://pub-eee.r2.dev
R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES=https://pub-fff.r2.dev
```

**Run:**

```bash
npx tsx scripts/backfill-image-variants.ts
```

**Tables processed:**

| Table             | Column       | Bucket                          | Variant Type              |
| ----------------- | ------------ | ------------------------------- | ------------------------- |
| movies            | poster_url   | faniverz-movie-posters          | poster (200/400/800px)    |
| movies            | backdrop_url | faniverz-movie-backdrops        | backdrop (480/960/1920px) |
| actors            | photo_url    | faniverz-actor-photos           | photo (100/200/400px)     |
| profiles          | avatar_url   | faniverz-profile-avatars        | avatar (64/128/256px)     |
| platforms         | logo_url     | faniverz-platform-logos         | photo (100/200/400px)     |
| production_houses | logo_url     | faniverz-production-house-logos | photo (100/200/400px)     |
| movie_posters     | image_url    | faniverz-movie-posters          | poster (200/400/800px)    |

---

## migrate-images-to-storage.ts

One-time migration from TMDB CDN URLs to Cloudflare R2. Finds all `image.tmdb.org` URLs in the DB, downloads and re-uploads to R2, updates the DB with R2 URLs.

## fix-r2-urls.ts

One-time URL rewrite from S3 API URLs (`*.r2.cloudflarestorage.com`) to public CDN URLs (`pub-*.r2.dev`).

## seed-telugu-movies.ts

Seeds the database with Telugu movies from TMDB API. Optionally uploads images to R2 when credentials are provided.
