/* eslint-disable no-console */
/**
 * Telugu movie seed / sync script.
 *
 * Populates the production Supabase DB with real Telugu movie data from TMDB.
 * Idempotent and incremental — safe to re-run; only new movies are fetched.
 *
 * Usage:
 *   # Test: first 5 movies from 2025, skip R2 image upload
 *   TMDB_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *     npx tsx scripts/seed-telugu-movies.ts --year 2025 --limit 5 --skip-images
 *
 *   # Full initial load for 2024 + 2025 with R2 images
 *   TMDB_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx \
 *   R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev \
 *     npx tsx scripts/seed-telugu-movies.ts --year 2024 --year 2025
 *
 *   # Weekly sync (add new 2025 releases only)
 *   ... npx tsx scripts/seed-telugu-movies.ts --year 2025
 *
 * Environment variables:
 *   TMDB_API_KEY               (required)
 *   SUPABASE_URL               (required)
 *   SUPABASE_SERVICE_ROLE_KEY  (required — service role bypasses RLS)
 *   R2_ACCOUNT_ID              (optional — if absent, stores TMDB URLs)
 *   R2_ACCESS_KEY_ID           (optional)
 *   R2_SECRET_ACCESS_KEY       (optional)
 *   R2_PUBLIC_BASE_URL         (optional)
 */

import { createClient } from '@supabase/supabase-js';
import {
  discoverTeluguMovies,
  getMovieDetails,
  extractTrailerUrl,
  extractKeyCrewMembers,
  TMDB_IMAGE,
} from './lib/tmdb';
import { uploadImageFromUrl, R2_BUCKETS } from './lib/storage';

// ── Env validation ────────────────────────────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Required env vars: TMDB_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const years: number[] = [];
let limit = Infinity;
let skipImages = false;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--year' && args[i + 1]) {
    years.push(parseInt(args[++i], 10));
  } else if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[++i], 10);
  } else if (args[i] === '--skip-images') {
    skipImages = true;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

if (years.length === 0) {
  years.push(new Date().getFullYear());
  console.log(`No --year specified; defaulting to ${years[0]}`);
}

if (dryRun) console.log('[DRY RUN] No DB writes will be performed.');
if (skipImages) console.log('[--skip-images] Images will be stored as TMDB URLs.');

// ── Supabase client ───────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Concurrency helper ────────────────────────────────────────────────────────

async function pLimit<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeReleaseType(releaseDate: string): 'upcoming' | 'theatrical' {
  return new Date(releaseDate) > new Date() ? 'upcoming' : 'theatrical';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeUpload(
  tmdbPath: string | null,
  bucket: string,
  key: string,
  imageBaseUrl: (path: string) => string,
): Promise<string | null> {
  if (!tmdbPath) return null;
  const sourceUrl = imageBaseUrl(tmdbPath);
  if (skipImages) return sourceUrl;
  return uploadImageFromUrl(sourceUrl, bucket, key);
}

// ── Sync counters ─────────────────────────────────────────────────────────────

let totalAdded = 0;
let totalSkipped = 0;
let totalFailed = 0;

// ── Per-movie processing ──────────────────────────────────────────────────────

async function processMovie(tmdbId: number, releaseDate: string): Promise<void> {
  try {
    await sleep(200); // polite rate limiting

    const detail = await getMovieDetails(tmdbId, TMDB_API_KEY!);

    const releaseType = computeReleaseType(releaseDate);
    const director = detail.credits.crew.find((c) => c.job === 'Director')?.name ?? null;

    // Upload / compute image URLs
    // Use tmdbId as a stable filename prefix until we have the Supabase UUID
    const tmpKey = String(tmdbId);
    const [posterUrl, backdropUrl] = await Promise.all([
      maybeUpload(detail.poster_path, R2_BUCKETS.moviePosters, `${tmpKey}.jpg`, TMDB_IMAGE.poster),
      maybeUpload(
        detail.backdrop_path,
        R2_BUCKETS.movieBackdrops,
        `${tmpKey}.jpg`,
        TMDB_IMAGE.backdrop,
      ),
    ]);

    const trailerUrl = extractTrailerUrl(detail.videos.results);
    const genres = detail.genres.map((g) => g.name);

    if (dryRun) {
      console.log(`  [DRY RUN] Would insert: ${detail.title} (${releaseDate})`);
      totalAdded++;
      return;
    }

    // ── Upsert movie ──────────────────────────────────────────────────────────
    //
    // Only TMDB-sourced fields are listed in the UPDATE SET — manually-curated
    // fields (certification, is_featured) are intentionally omitted so they
    // are never overwritten by the sync script.
    //
    const { data: movie, error: movieErr } = await supabase
      .from('movies')
      .upsert(
        {
          tmdb_id: detail.id,
          title: detail.title,
          synopsis: detail.overview || null,
          release_date: releaseDate,
          runtime: detail.runtime ?? null,
          genres,
          poster_url: posterUrl,
          backdrop_url: backdropUrl,
          trailer_url: trailerUrl,
          director,
          release_type: releaseType,
          original_language: 'te',
          tmdb_last_synced_at: new Date().toISOString(),
          // certification and is_featured intentionally omitted (manual fields)
        },
        {
          onConflict: 'tmdb_id',
          ignoreDuplicates: false, // DO UPDATE (not DO NOTHING) to refresh sync date
        },
      )
      .select('id')
      .single();

    if (movieErr) throw movieErr;
    const movieId = movie.id as string;

    // ── Upsert cast (top 15) ──────────────────────────────────────────────────

    const topCast = detail.credits.cast.slice(0, 15);

    // Delete existing cast for this movie to avoid stale entries on re-sync
    await supabase.from('movie_cast').delete().eq('movie_id', movieId);

    for (const castMember of topCast) {
      const photoUrl = await maybeUpload(
        castMember.profile_path,
        R2_BUCKETS.actorPhotos,
        `${castMember.id}.jpg`,
        TMDB_IMAGE.profile,
      );

      const { data: actor, error: actorErr } = await supabase
        .from('actors')
        .upsert(
          {
            tmdb_person_id: castMember.id,
            name: castMember.name,
            photo_url: photoUrl,
            person_type: 'actor',
            gender: castMember.gender ?? null,
            // birth_date intentionally omitted — filled by separate backfill pass
            // tier_rank intentionally omitted — always manual
          },
          { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
        )
        .select('id')
        .single();

      if (actorErr) {
        console.warn(`    actor upsert failed [${castMember.name}]: ${actorErr.message}`);
        continue;
      }

      await supabase.from('movie_cast').insert({
        movie_id: movieId,
        actor_id: actor.id,
        role_name: castMember.character || null,
        display_order: castMember.order,
        credit_type: 'cast',
        role_order: null,
      });
    }

    // ── Upsert crew ───────────────────────────────────────────────────────────

    const keyCrew = extractKeyCrewMembers(detail.credits.crew);

    for (const crewMember of keyCrew) {
      const photoUrl = await maybeUpload(
        crewMember.profile_path,
        R2_BUCKETS.actorPhotos,
        `${crewMember.id}.jpg`,
        TMDB_IMAGE.profile,
      );

      const { data: actor, error: actorErr } = await supabase
        .from('actors')
        .upsert(
          {
            tmdb_person_id: crewMember.id,
            name: crewMember.name,
            photo_url: photoUrl,
            person_type: 'technician',
            gender: crewMember.gender ?? null,
          },
          { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
        )
        .select('id')
        .single();

      if (actorErr) {
        console.warn(`    crew upsert failed [${crewMember.name}]: ${actorErr.message}`);
        continue;
      }

      await supabase.from('movie_cast').insert({
        movie_id: movieId,
        actor_id: actor.id,
        role_name: crewMember.roleName,
        display_order: 0,
        credit_type: 'crew',
        role_order: crewMember.roleOrder,
      });
    }

    process.stdout.write('.');
    totalAdded++;
  } catch (err) {
    console.error(`\n  Failed tmdb_id=${tmdbId}: ${(err as Error).message}`);
    totalFailed++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Faniverz Telugu movie seed / sync ===');
  console.log(`Years: ${years.join(', ')} | Limit: ${limit === Infinity ? 'none' : limit}`);

  const syncStart = new Date().toISOString();
  let syncLogId: string | null = null;

  if (!dryRun) {
    // Open sync log
    const { data } = await supabase
      .from('sync_logs')
      .insert({
        function_name: 'seed-telugu-movies',
        status: 'running',
        started_at: syncStart,
      })
      .select('id')
      .single();
    syncLogId = data?.id ?? null;
  }

  for (const year of years) {
    console.log(`\n[${year}] Discovering Telugu films from TMDB...`);
    const allMovies = await discoverTeluguMovies(year, TMDB_API_KEY!);
    console.log(`[${year}] Found ${allMovies.length} films on TMDB`);

    // Batch existence check — avoid fetching details for movies already in DB
    const allTmdbIds = allMovies.map((m) => m.id);
    const { data: existingRows } = await supabase
      .from('movies')
      .select('tmdb_id')
      .in('tmdb_id', allTmdbIds);

    const existingIds = new Set((existingRows ?? []).map((r) => r.tmdb_id as number));
    let newMovies = allMovies.filter((m) => !existingIds.has(m.id));

    totalSkipped += existingIds.size;
    console.log(`[${year}] ${existingIds.size} already in DB, ${newMovies.length} new to import`);

    if (limit !== Infinity) {
      newMovies = newMovies.slice(0, limit);
      console.log(`[${year}] Limiting to first ${newMovies.length} (--limit)`);
    }

    if (newMovies.length === 0) continue;

    process.stdout.write(`[${year}] Importing: `);
    await pLimit(newMovies, 3, (movie) => processMovie(movie.id, movie.release_date));
    console.log(); // newline after dots
  }

  // ── Close sync log ────────────────────────────────────────────────────────

  const summary = {
    added: totalAdded,
    skipped: totalSkipped,
    failed: totalFailed,
  };

  console.log('\n=== Summary ===');
  console.log(`  Added   : ${summary.added}`);
  console.log(`  Skipped : ${summary.skipped} (already in DB)`);
  console.log(`  Failed  : ${summary.failed}`);

  if (!dryRun && syncLogId) {
    await supabase
      .from('sync_logs')
      .update({
        status: totalFailed === 0 ? 'success' : 'failed',
        movies_added: totalAdded,
        movies_updated: 0,
        errors: totalFailed > 0 ? [{ message: `${totalFailed} movies failed to import` }] : [],
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);
  }

  if (totalFailed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
