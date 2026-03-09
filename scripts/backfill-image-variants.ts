/* eslint-disable no-console */
/**
 * Backfill script: ensures every R2 image has _sm, _md, _lg variants.
 *
 * Usage:
 *   R2_ACCOUNT_ID=xxx \
 *   R2_ACCESS_KEY_ID=xxx \
 *   R2_SECRET_ACCESS_KEY=xxx \
 *   R2_PUBLIC_BASE_URL_POSTERS=https://pub-aaa.r2.dev \
 *   R2_PUBLIC_BASE_URL_BACKDROPS=https://pub-bbb.r2.dev \
 *   R2_PUBLIC_BASE_URL_ACTORS=https://pub-ccc.r2.dev \
 *   R2_PUBLIC_BASE_URL_AVATARS=https://pub-ddd.r2.dev \
 *   R2_PUBLIC_BASE_URL_PLATFORMS=https://pub-eee.r2.dev \
 *   R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES=https://pub-fff.r2.dev \
 *   SUPABASE_URL=xxx \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *     npx tsx scripts/backfill-image-variants.ts
 *
 * Safe to re-run — images with existing _sm variant are skipped.
 *
 * Efficiency: Uses ListObjectsV2 to build an in-memory index of each bucket
 * (one paginated API call per bucket) instead of per-image HEAD requests.
 * Only images missing their _sm variant are downloaded and processed.
 */

import { createClient } from '@supabase/supabase-js';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { generateVariants } from './lib/image-resize';
import { VARIANT_SPECS, type VariantType } from './lib/variant-config';

// ── Env validation ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY
) {
  console.error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required.');
  process.exit(1);
}

const PUBLIC_URLS = {
  posters: process.env.R2_PUBLIC_BASE_URL_POSTERS,
  backdrops: process.env.R2_PUBLIC_BASE_URL_BACKDROPS,
  actors: process.env.R2_PUBLIC_BASE_URL_ACTORS,
  avatars: process.env.R2_PUBLIC_BASE_URL_AVATARS,
  platforms: process.env.R2_PUBLIC_BASE_URL_PLATFORMS,
  productionHouses: process.env.R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES,
} as const;

for (const [name, url] of Object.entries(PUBLIC_URLS)) {
  if (!url) {
    console.error(`R2 public URL for "${name}" is not configured.`);
    process.exit(1);
  }
}

// ── Clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ── Image source config ──────────────────────────────────────────────────────

interface ImageSource {
  table: string;
  column: string;
  bucket: string;
  variantType: VariantType;
  publicBaseUrl: string;
}

const IMAGE_SOURCES: ImageSource[] = [
  {
    table: 'movies',
    column: 'poster_url',
    bucket: 'faniverz-movie-posters',
    variantType: 'poster',
    publicBaseUrl: PUBLIC_URLS.posters!,
  },
  {
    table: 'movies',
    column: 'backdrop_url',
    bucket: 'faniverz-movie-backdrops',
    variantType: 'backdrop',
    publicBaseUrl: PUBLIC_URLS.backdrops!,
  },
  {
    table: 'actors',
    column: 'photo_url',
    bucket: 'faniverz-actor-photos',
    variantType: 'photo',
    publicBaseUrl: PUBLIC_URLS.actors!,
  },
  {
    table: 'profiles',
    column: 'avatar_url',
    bucket: 'faniverz-profile-avatars',
    variantType: 'avatar',
    publicBaseUrl: PUBLIC_URLS.avatars!,
  },
  {
    table: 'platforms',
    column: 'logo_url',
    bucket: 'faniverz-platform-logos',
    variantType: 'photo',
    publicBaseUrl: PUBLIC_URLS.platforms!,
  },
  {
    table: 'production_houses',
    column: 'logo_url',
    bucket: 'faniverz-production-house-logos',
    variantType: 'photo',
    publicBaseUrl: PUBLIC_URLS.productionHouses!,
  },
  {
    table: 'movie_posters',
    column: 'image_url',
    bucket: 'faniverz-movie-posters',
    variantType: 'poster',
    publicBaseUrl: PUBLIC_URLS.posters!,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isR2Url(url: string, publicBaseUrl: string): boolean {
  return url.startsWith(publicBaseUrl.replace(/\/$/, ''));
}

function extractKey(url: string, publicBaseUrl: string): string {
  const base = publicBaseUrl.replace(/\/$/, '');
  return url.slice(base.length + 1);
}

function variantKey(key: string, suffix: string): string {
  const dotIdx = key.lastIndexOf('.');
  const baseName = dotIdx > 0 ? key.slice(0, dotIdx) : key;
  const ext = dotIdx > 0 ? key.slice(dotIdx + 1) : 'jpg';
  return `${baseName}${suffix}.${ext}`;
}

/** List all object keys in a bucket using paginated ListObjectsV2. */
async function listBucketKeys(bucket: string): Promise<Set<string>> {
  const keys = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    for (const obj of result.Contents ?? []) {
      if (obj.Key) keys.add(obj.Key);
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

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

// ── Counters ─────────────────────────────────────────────────────────────────

let totalProcessed = 0;
let skippedExisting = 0;
let skippedNonR2 = 0;
let generated = 0;
let failed = 0;

// ── Bucket index cache ───────────────────────────────────────────────────────

const bucketIndexCache = new Map<string, Set<string>>();

async function getBucketIndex(bucket: string): Promise<Set<string>> {
  const cached = bucketIndexCache.get(bucket);
  if (cached) return cached;

  console.log(`  Indexing bucket "${bucket}"...`);
  const keys = await listBucketKeys(bucket);
  console.log(`  Found ${keys.size} objects.`);
  bucketIndexCache.set(bucket, keys);
  return keys;
}

// ── Core backfill ────────────────────────────────────────────────────────────

async function backfillSource(source: ImageSource) {
  console.log(`\n── ${source.table}.${source.column} ──`);

  const bucketKeys = await getBucketIndex(source.bucket);

  const { data: rows, error } = await supabase
    .from(source.table)
    .select(`id, ${source.column}`)
    .not(source.column, 'is', null);

  if (error) throw error;
  console.log(`  Rows with non-null URLs: ${rows?.length ?? 0}`);

  // Filter to only rows that need backfilling (no network calls here)
  const needsBackfill: { id: unknown; key: string }[] = [];

  for (const row of rows ?? []) {
    totalProcessed++;
    const url = row[source.column] as string | null;
    if (!url) continue;

    if (!isR2Url(url, source.publicBaseUrl)) {
      skippedNonR2++;
      continue;
    }

    const key = extractKey(url, source.publicBaseUrl);
    const smKey = variantKey(key, '_sm');

    if (bucketKeys.has(smKey)) {
      skippedExisting++;
      continue;
    }

    needsBackfill.push({ id: row.id, key });
  }

  console.log(`  Need backfill: ${needsBackfill.length}`);
  if (needsBackfill.length === 0) return;

  await pLimit(needsBackfill, 3, async ({ id, key }) => {
    try {
      const getResult = await r2.send(new GetObjectCommand({ Bucket: source.bucket, Key: key }));
      const body = await getResult.Body?.transformToByteArray();
      if (!body) throw new Error('Empty body from R2');

      const buffer = Buffer.from(body);
      const contentType = getResult.ContentType ?? 'image/jpeg';
      const specs = VARIANT_SPECS[source.variantType];
      const variants = await generateVariants(buffer, contentType, specs);

      await Promise.all(
        variants.map((v) =>
          r2.send(
            new PutObjectCommand({
              Bucket: source.bucket,
              Key: variantKey(key, v.suffix),
              Body: v.buffer,
              ContentType: v.contentType,
            }),
          ),
        ),
      );

      generated++;
      process.stdout.write('+');
    } catch (e) {
      console.error(`\n  FAIL [${source.table}.${id}]: ${(e as Error).message}`);
      failed++;
    }
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Faniverz R2 image variant backfill ===');
  console.log('Ensures every R2 image has _sm, _md, _lg variants.\n');

  for (const source of IMAGE_SOURCES) {
    await backfillSource(source);
  }

  console.log('\n\n=== Summary ===');
  console.log(`  Total rows checked  : ${totalProcessed}`);
  console.log(`  Already had variants: ${skippedExisting}`);
  console.log(`  Skipped (non-R2)    : ${skippedNonR2}`);
  console.log(`  Generated           : ${generated}`);
  console.log(`  Failed              : ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
