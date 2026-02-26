/* eslint-disable no-console */
/**
 * One-time migration script: download all TMDB-hosted images and upload to Cloudflare R2.
 *
 * Run against production once R2 buckets are set up:
 *
 *   R2_ACCOUNT_ID=xxx \
 *   R2_ACCESS_KEY_ID=xxx \
 *   R2_SECRET_ACCESS_KEY=xxx \
 *   R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev \
 *   SUPABASE_URL=xxx \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *     npx tsx scripts/migrate-images-to-storage.ts
 *
 * Safe to re-run — rows already pointing to R2 are skipped.
 */

import { createClient } from '@supabase/supabase-js';
import { uploadImageFromUrl, R2_BUCKETS } from './lib/storage';

// ── Env validation ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

if (!R2_PUBLIC_BASE_URL) {
  console.error('R2_PUBLIC_BASE_URL is required (e.g. https://pub-xxx.r2.dev).');
  process.exit(1);
}

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
  console.error(
    'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required for migration.',
  );
  process.exit(1);
}

// ── Supabase client ───────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Concurrency helper ────────────────────────────────────────────────────────

async function pLimit<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ── Counters ──────────────────────────────────────────────────────────────────

let skipped = 0;
let migrated = 0;
let failed = 0;

function isTmdbUrl(url: string | null): boolean {
  return !!url && url.includes('image.tmdb.org');
}

// ── Movie migration ───────────────────────────────────────────────────────────

async function migrateMovies() {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, poster_url, backdrop_url')
    .or('poster_url.like.%image.tmdb.org%,backdrop_url.like.%image.tmdb.org%');

  if (error) throw error;
  console.log(`\nMovies to process: ${movies?.length ?? 0}`);

  await pLimit(movies ?? [], 5, async (movie) => {
    const updates: Record<string, string> = {};

    if (isTmdbUrl(movie.poster_url)) {
      try {
        updates.poster_url = await uploadImageFromUrl(
          movie.poster_url!,
          R2_BUCKETS.moviePosters,
          `${movie.id}.jpg`,
        );
        migrated++;
      } catch (e) {
        console.error(`  poster failed [${movie.id}]:`, e);
        failed++;
      }
    } else {
      skipped++;
    }

    if (isTmdbUrl(movie.backdrop_url)) {
      try {
        updates.backdrop_url = await uploadImageFromUrl(
          movie.backdrop_url!,
          R2_BUCKETS.movieBackdrops,
          `${movie.id}.jpg`,
        );
        migrated++;
      } catch (e) {
        console.error(`  backdrop failed [${movie.id}]:`, e);
        failed++;
      }
    } else {
      skipped++;
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase.from('movies').update(updates).eq('id', movie.id);
      if (upErr) {
        console.error(`  DB update failed [${movie.id}]:`, upErr.message);
        failed++;
      } else {
        process.stdout.write('.');
      }
    }
  });
}

// ── Actor migration ───────────────────────────────────────────────────────────

async function migrateActors() {
  const { data: actors, error } = await supabase
    .from('actors')
    .select('id, photo_url')
    .like('photo_url', '%image.tmdb.org%');

  if (error) throw error;
  console.log(`\nActors to process: ${actors?.length ?? 0}`);

  await pLimit(actors ?? [], 5, async (actor) => {
    if (!isTmdbUrl(actor.photo_url)) {
      skipped++;
      return;
    }
    try {
      const newUrl = await uploadImageFromUrl(
        actor.photo_url!,
        R2_BUCKETS.actorPhotos,
        `${actor.id}.jpg`,
      );
      const { error: upErr } = await supabase
        .from('actors')
        .update({ photo_url: newUrl })
        .eq('id', actor.id);
      if (upErr) {
        console.error(`  DB update failed [${actor.id}]:`, upErr.message);
        failed++;
      } else {
        migrated++;
        process.stdout.write('.');
      }
    } catch (e) {
      console.error(`  photo failed [${actor.id}]:`, e);
      failed++;
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Faniverz image migration: TMDB CDN → Cloudflare R2 ===');
  console.log(`R2 public base: ${R2_PUBLIC_BASE_URL}`);

  await migrateMovies();
  await migrateActors();

  console.log('\n\n=== Summary ===');
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped} (already on R2)`);
  console.log(`  Failed   : ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
