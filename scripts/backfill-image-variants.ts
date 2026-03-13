/* eslint-disable no-console */
/**
 * Backfill script: ensures every image is on R2 with _sm, _md, _lg variants.
 *
 * Handles two cases:
 *   1. External URLs (e.g. TMDB CDN) → download, upload to R2 with variants, update DB
 *   2. R2 URLs missing variants → download original from R2, generate & upload variants
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
 * For local dev with MinIO, set R2_ENDPOINT=http://localhost:9000 instead of R2_ACCOUNT_ID.
 *
 * Safe to re-run — images already on R2 with variants are skipped.
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

const R2_ENDPOINT = process.env.R2_ENDPOINT; // custom endpoint for MinIO / local dev

if (!R2_ENDPOINT && !process.env.R2_ACCOUNT_ID) {
  console.error('Either R2_ENDPOINT or R2_ACCOUNT_ID is required.');
  process.exit(1);
}

if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required.');
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  },
});

const r2Endpoint = R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: !!R2_ENDPOINT,
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

/** Upload a buffer + its variants to R2. Returns the public URL. */
async function uploadWithVariants(
  buffer: Buffer,
  contentType: string,
  bucket: string,
  key: string,
  variantType: VariantType,
  publicBaseUrl: string,
): Promise<string> {
  const specs = VARIANT_SPECS[variantType];
  const variants = await generateVariants(buffer, contentType, specs);

  await Promise.all([
    r2.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
    ),
    ...variants.map((v) =>
      r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: variantKey(key, v.suffix),
          Body: v.buffer,
          ContentType: v.contentType,
        }),
      ),
    ),
  ]);

  return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
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
let migratedExternal = 0;
let generatedVariants = 0;
let failed = 0;
const manualFixSql: string[] = [];

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

interface ExternalRow {
  id: unknown;
  url: string;
  key: string;
}
interface MissingVariantRow {
  id: unknown;
  key: string;
}

async function backfillSource(source: ImageSource) {
  console.log(`\n── ${source.table}.${source.column} ──`);

  const bucketKeys = await getBucketIndex(source.bucket);

  // Paginate to fetch ALL rows (Supabase default limit is 1000)
  const allRows: Record<string, unknown>[] = [];
  const PAGE = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: page, error: pgErr } = await supabase
      .from(source.table)
      .select(`id, ${source.column}`)
      .not(source.column, 'is', null)
      .range(offset, offset + PAGE - 1);
    if (pgErr) throw pgErr;
    if (!page || page.length === 0) {
      hasMore = false;
      break;
    }
    allRows.push(...page);
    if (page.length < PAGE) {
      hasMore = false;
      break;
    }
    offset += PAGE;
  }
  const rows = allRows;
  console.log(`  Rows with non-null URLs: ${rows.length}`);

  // Categorise rows without any network calls
  const externals: ExternalRow[] = [];
  const missingVariants: MissingVariantRow[] = [];

  for (const row of rows ?? []) {
    totalProcessed++;
    const url = row[source.column] as string | null;
    if (!url) continue;

    if (!isR2Url(url, source.publicBaseUrl)) {
      // External URL (TMDB CDN etc.) → migrate to R2 with variants
      const key = `${row.id}.jpg`;
      externals.push({ id: row.id, url, key });
      continue;
    }

    const key = extractKey(url, source.publicBaseUrl);
    const smKey = variantKey(key, '_sm');

    if (bucketKeys.has(smKey)) {
      skippedExisting++;
      continue;
    }

    missingVariants.push({ id: row.id, key });
  }

  // ── Handle external URLs: download → upload to R2 with variants → update DB ──
  if (externals.length > 0) {
    console.log(`  External URLs to migrate: ${externals.length}`);
    await pLimit(externals, 3, async ({ id, url, key }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') ?? 'image/jpeg';

        const newUrl = await uploadWithVariants(
          buffer,
          contentType,
          source.bucket,
          key,
          source.variantType,
          source.publicBaseUrl,
        );

        const { error: upErr, count } = await supabase
          .from(source.table)
          .update({ [source.column]: newUrl }, { count: 'exact' })
          .eq('id', id);

        if (upErr || count === 0) {
          // Image uploaded to R2 but DB update blocked (RLS) — emit SQL for manual fix
          const safeSql = `UPDATE ${source.table} SET ${source.column} = '${newUrl}' WHERE id = '${id}';`;
          manualFixSql.push(safeSql);
          console.error(
            `\n  WARN [${source.table}.${id}]: DB update blocked by RLS — image uploaded, SQL emitted`,
          );
          failed++;
        } else {
          console.log(`\n    [${id}] ${url} → ${newUrl} (rows affected: ${count})`);
          migratedExternal++;
          process.stdout.write('M');
        }
      } catch (e) {
        console.error(`\n  FAIL migrate [${source.table}.${id}]: ${(e as Error).message}`);
        failed++;
      }
    });
  }

  // ── Handle R2 URLs missing variants: download original → generate & upload variants ──
  if (missingVariants.length > 0) {
    console.log(`  R2 images missing variants: ${missingVariants.length}`);
    await pLimit(missingVariants, 3, async ({ id, key }) => {
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

        generatedVariants++;
        process.stdout.write('+');
      } catch (e) {
        console.error(`\n  FAIL variants [${source.table}.${id}]: ${(e as Error).message}`);
        failed++;
      }
    });
  }

  if (externals.length === 0 && missingVariants.length === 0) {
    console.log('  Nothing to do.');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Faniverz R2 image variant backfill ===');
  console.log('Migrates external URLs to R2 and ensures all images have _sm, _md, _lg variants.\n');

  for (const source of IMAGE_SOURCES) {
    try {
      await backfillSource(source);
    } catch (e) {
      console.error(`\n  Skipping ${source.table}.${source.column}: ${(e as Error).message}`);
    }
  }

  console.log('\n\n=== Summary ===');
  console.log(`  Total rows checked    : ${totalProcessed}`);
  console.log(`  Already complete      : ${skippedExisting}`);
  console.log(`  Migrated from external: ${migratedExternal}`);
  console.log(`  Generated variants    : ${generatedVariants}`);
  console.log(`  Failed                : ${failed}`);

  if (manualFixSql.length > 0) {
    console.log(`\n=== Manual SQL fixes (run in Supabase Dashboard SQL Editor) ===\n`);
    console.log(manualFixSql.join('\n'));
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
