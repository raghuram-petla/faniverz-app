import { NextRequest, NextResponse } from 'next/server';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdmin, unauthorizedResponse } from '@/lib/sync-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getR2Client } from '@/lib/r2-client';
import type { ScanResult, ScanEntity } from '@/hooks/useValidationTypes';
import type { VariantType } from '@/lib/variant-config';

const TMDB_DOMAIN = 'image.tmdb.org';
const DEEP_SCAN_CONCURRENCY = 10;

interface EntityScanConfig {
  table: string;
  field: string;
  bucket: string;
  variantType: VariantType | null;
  labelField: string;
  tmdbField: string | null;
}

// @coupling: bucket names must match upload route configs
const ENTITY_CONFIGS: Record<ScanEntity, EntityScanConfig[]> = {
  movies: [
    {
      table: 'movies',
      field: 'poster_url',
      bucket: 'faniverz-movie-posters',
      variantType: 'poster',
      labelField: 'title',
      tmdbField: 'tmdb_id',
    },
    {
      table: 'movies',
      field: 'backdrop_url',
      bucket: 'faniverz-movie-backdrops',
      variantType: 'backdrop',
      labelField: 'title',
      tmdbField: 'tmdb_id',
    },
  ],
  movie_images: [
    {
      table: 'movie_images',
      field: 'image_url',
      bucket: 'faniverz-movie-posters',
      variantType: 'poster',
      labelField: 'title',
      tmdbField: null,
    },
  ],
  actors: [
    {
      table: 'actors',
      field: 'photo_url',
      bucket: 'faniverz-actor-photos',
      variantType: 'photo',
      labelField: 'name',
      tmdbField: 'tmdb_person_id',
    },
  ],
  platforms: [
    {
      table: 'platforms',
      field: 'logo_url',
      bucket: 'faniverz-platform-logos',
      variantType: null,
      labelField: 'name',
      tmdbField: null,
    },
  ],
  production_houses: [
    {
      table: 'production_houses',
      field: 'logo_url',
      bucket: 'faniverz-production-house-logos',
      variantType: null,
      labelField: 'name',
      tmdbField: null,
    },
  ],
  profiles: [
    {
      table: 'profiles',
      field: 'avatar_url',
      bucket: 'faniverz-profile-avatars',
      variantType: 'avatar',
      labelField: 'display_name',
      tmdbField: null,
    },
  ],
};

function classifyUrl(url: string): 'local' | 'external' | 'full_r2' {
  if (!url.startsWith('http')) return 'local';
  if (url.includes(TMDB_DOMAIN)) return 'external';
  return 'full_r2';
}

// @boundary: admin-only scan — DB-based classification by default, optional R2 HeadObject deep scan
export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request.headers.get('authorization'));
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const entity = body.entity as ScanEntity;
  const deep = body.deep === true;

  const configs = ENTITY_CONFIGS[entity];
  if (!configs) {
    return NextResponse.json({ error: `Invalid entity: ${entity}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const config = configs[0];
  const selectFields = [
    'id',
    config.field,
    config.labelField,
    ...(config.tmdbField ? [config.tmdbField] : []),
    // @edge: for movies, also select backdrop_url alongside poster_url
    ...(entity === 'movies' ? ['backdrop_url'] : []),
  ].join(',');

  // @sideeffect: queries all rows with non-null image URL
  const { data, error, count } = await supabase
    .from(config.table)
    .select(selectFields, { count: 'exact' })
    .not(config.field, 'is', null)
    .order('id');

  if (error) {
    console.error('[validations/scan] DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: ScanResult[] = [];

  for (const row of (data as unknown as Record<string, unknown>[]) ?? []) {
    for (const cfg of configs) {
      const url = row[cfg.field] as string | null;
      if (!url) continue;

      const urlType = classifyUrl(url);
      const label = (row[cfg.labelField] as string) ?? (row.id as string);
      const tmdbId = cfg.tmdbField ? (row[cfg.tmdbField] as number | null) : null;

      results.push({
        id: row.id as string,
        entity: cfg.table,
        field: cfg.field,
        currentUrl: url,
        urlType,
        // @contract: variant fields null for basic scan, populated only in deep scan
        originalExists: null,
        variants: { sm: null, md: null, lg: null },
        entityLabel: label,
        tmdbId,
      });
    }
  }

  // @sideeffect: optional deep scan — HeadObject checks for local/full_r2 keys
  if (deep) {
    await deepScanVariants(results, configs);
  }

  return NextResponse.json({ results, total: count ?? 0 });
}

// @sideeffect: HeadObject calls to R2 for variant existence checks
async function deepScanVariants(results: ScanResult[], configs: EntityScanConfig[]): Promise<void> {
  const r2 = getR2Client();
  if (!r2) return;

  const localResults = results.filter((r) => r.urlType !== 'external');
  const tasks: (() => Promise<void>)[] = [];

  for (const result of localResults) {
    const cfg = configs.find((c) => c.field === result.field);
    if (!cfg) continue;

    const key =
      result.urlType === 'local' ? result.currentUrl : extractKeyFromUrl(result.currentUrl);
    const dotIdx = key.lastIndexOf('.');
    const baseName = dotIdx > 0 ? key.slice(0, dotIdx) : key;
    const ext = dotIdx > 0 ? key.slice(dotIdx + 1) : 'jpg';

    tasks.push(async () => {
      result.originalExists = await objectExists(r2, cfg.bucket, key);
    });

    if (cfg.variantType) {
      for (const suffix of ['_sm', '_md', '_lg'] as const) {
        const sizeKey = suffix.slice(1) as 'sm' | 'md' | 'lg';
        tasks.push(async () => {
          result.variants[sizeKey] = await objectExists(
            r2,
            cfg.bucket,
            `${baseName}${suffix}.${ext}`,
          );
        });
      }
    }
  }

  await withConcurrency(tasks, DEEP_SCAN_CONCURRENCY);
}

// @contract: checks if an R2 object exists; returns true/false, never throws
async function objectExists(
  r2: NonNullable<ReturnType<typeof getR2Client>>,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// @contract: simple concurrency limiter for HeadObject calls
async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  const run = async () => {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => run()));
  return results;
}

// @assumes: full R2 URLs end with the object key after the last '/'
function extractKeyFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1];
}
