/* eslint-disable no-console */
/**
 * One-time fix: replaces S3 API URLs stored in the DB with correct public URLs.
 *
 * Images are already in R2 — this only rewrites the URL strings in the DB.
 *
 * Old format (wrong): https://ACCOUNT_ID.r2.cloudflarestorage.com/BUCKET/KEY.jpg
 * New format (correct): https://pub-xxxx.r2.dev/KEY.jpg
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   R2_PUBLIC_BASE_URL_POSTERS=https://pub-aaa.r2.dev \
 *   R2_PUBLIC_BASE_URL_BACKDROPS=https://pub-bbb.r2.dev \
 *   R2_PUBLIC_BASE_URL_ACTORS=https://pub-ccc.r2.dev \
 *     npx tsx scripts/fix-r2-urls.ts
 */

import { createClient } from '@supabase/supabase-js';

// ── Env validation ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POSTERS_URL = process.env.R2_PUBLIC_BASE_URL_POSTERS;
const BACKDROPS_URL = process.env.R2_PUBLIC_BASE_URL_BACKDROPS;
const ACTORS_URL = process.env.R2_PUBLIC_BASE_URL_ACTORS;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !POSTERS_URL || !BACKDROPS_URL || !ACTORS_URL) {
  console.error(
    'Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ' +
      'R2_PUBLIC_BASE_URL_POSTERS, R2_PUBLIC_BASE_URL_BACKDROPS, R2_PUBLIC_BASE_URL_ACTORS',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

const BUCKET_PUBLIC_URL: Record<string, string> = {
  'faniverz-movie-posters': POSTERS_URL,
  'faniverz-movie-backdrops': BACKDROPS_URL,
  'faniverz-actor-photos': ACTORS_URL,
};

function isOldUrl(url: string | null): boolean {
  return !!url && url.includes('.r2.cloudflarestorage.com');
}

/**
 * Converts:  https://ACCOUNT.r2.cloudflarestorage.com/faniverz-movie-posters/uuid.jpg
 * To:        https://pub-xxx.r2.dev/uuid.jpg
 */
function fixUrl(url: string): string {
  // Path is: /BUCKET_NAME/KEY.jpg
  const match = url.match(/\.r2\.cloudflarestorage\.com\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Unrecognised R2 URL format: ${url}`);
  const [, bucketName, key] = match;
  const publicBase = BUCKET_PUBLIC_URL[bucketName];
  if (!publicBase) throw new Error(`No public URL configured for bucket: ${bucketName}`);
  return `${publicBase.replace(/\/$/, '')}/${key}`;
}

// ── Counters ──────────────────────────────────────────────────────────────────

let fixed = 0;
let skipped = 0;
let failed = 0;

// ── Fix movies ────────────────────────────────────────────────────────────────

async function fixMovies() {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, poster_url, backdrop_url')
    .or('poster_url.like.%cloudflarestorage.com%,backdrop_url.like.%cloudflarestorage.com%');

  if (error) throw error;
  console.log(`\nMovies to fix: ${movies?.length ?? 0}`);

  for (const movie of movies ?? []) {
    const updates: Record<string, string> = {};

    if (isOldUrl(movie.poster_url)) {
      try {
        updates.poster_url = fixUrl(movie.poster_url!);
        fixed++;
      } catch (e) {
        console.error(`  poster failed [${movie.id}]: ${(e as Error).message}`);
        failed++;
      }
    } else {
      skipped++;
    }

    if (isOldUrl(movie.backdrop_url)) {
      try {
        updates.backdrop_url = fixUrl(movie.backdrop_url!);
        fixed++;
      } catch (e) {
        console.error(`  backdrop failed [${movie.id}]: ${(e as Error).message}`);
        failed++;
      }
    } else {
      skipped++;
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase.from('movies').update(updates).eq('id', movie.id);
      if (upErr) {
        console.error(`  DB update failed [${movie.id}]: ${upErr.message}`);
        failed++;
      } else {
        process.stdout.write('.');
      }
    }
  }
}

// ── Fix actors ────────────────────────────────────────────────────────────────

async function fixActors() {
  const { data: actors, error } = await supabase
    .from('actors')
    .select('id, photo_url')
    .like('photo_url', '%cloudflarestorage.com%');

  if (error) throw error;
  console.log(`\nActors to fix: ${actors?.length ?? 0}`);

  for (const actor of actors ?? []) {
    if (!isOldUrl(actor.photo_url)) {
      skipped++;
      continue;
    }
    try {
      const newUrl = fixUrl(actor.photo_url!);
      const { error: upErr } = await supabase
        .from('actors')
        .update({ photo_url: newUrl })
        .eq('id', actor.id);
      if (upErr) {
        console.error(`  DB update failed [${actor.id}]: ${upErr.message}`);
        failed++;
      } else {
        fixed++;
        process.stdout.write('.');
      }
    } catch (e) {
      console.error(`  failed [${actor.id}]: ${(e as Error).message}`);
      failed++;
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Faniverz R2 URL fix ===');
  console.log('Replacing S3 API URLs with public CDN URLs (no re-upload needed).');

  await fixMovies();
  await fixActors();

  console.log('\n\n=== Summary ===');
  console.log(`  Fixed   : ${fixed}`);
  console.log(`  Skipped : ${skipped} (already correct or null)`);
  console.log(`  Failed  : ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
