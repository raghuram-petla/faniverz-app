import { NextRequest, NextResponse } from 'next/server';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdmin } from '@/lib/sync-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getR2Client } from '@/lib/r2-client';
import type { ScanResult, ScanEntity } from '@/hooks/useValidationTypes';
import type { VariantType } from '@/lib/variant-config';

const TMDB_DOMAIN = 'image.tmdb.org';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CONCURRENCY = 10;

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
  movie_posters: [
    {
      table: 'movie_posters',
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

function classifyUrl(url: string): 'local' | 'external' | 'full_r2' {
  if (!url.startsWith('http')) return 'local';
  if (url.includes(TMDB_DOMAIN)) return 'external';
  return 'full_r2';
}

// @boundary: admin-only, paginated scan with R2 HeadObject checks
export async function POST(request: NextRequest) {
  const user = await verifyAdmin(request.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const entity = body.entity as ScanEntity;
  const cursor = Math.max(0, Number(body.cursor) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT));

  const configs = ENTITY_CONFIGS[entity];
  if (!configs) {
    return NextResponse.json({ error: `Invalid entity: ${entity}` }, { status: 400 });
  }

  const r2 = getR2Client();
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

  // @sideeffect: queries DB with pagination
  const { data, error, count } = await supabase
    .from(config.table)
    .select(selectFields, { count: 'exact' })
    .not(config.field, 'is', null)
    .range(cursor, cursor + limit - 1)
    .order('id');

  if (error) {
    console.error('[validations/scan] DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: ScanResult[] = [];

  // @sideeffect: HeadObject calls to R2 for each row's image + variants
  for (const row of (data as unknown as Record<string, unknown>[]) ?? []) {
    for (const cfg of configs) {
      const url = row[cfg.field] as string | null;
      if (!url) continue;

      const urlType = classifyUrl(url);
      const label = (row[cfg.labelField] as string) ?? (row.id as string);
      const tmdbId = cfg.tmdbField ? (row[cfg.tmdbField] as number | null) : null;

      const result: ScanResult = {
        id: row.id as string,
        entity: cfg.table,
        field: cfg.field,
        currentUrl: url,
        urlType,
        originalExists: null,
        variants: { sm: null, md: null, lg: null },
        entityLabel: label,
        tmdbId,
      };

      // @edge: external URLs can't be variant-checked in R2
      if (urlType === 'external' || !r2) {
        results.push(result);
        continue;
      }

      // For local keys, check original + variants in R2
      const key = urlType === 'local' ? url : extractKeyFromUrl(url);
      const dotIdx = key.lastIndexOf('.');
      const baseName = dotIdx > 0 ? key.slice(0, dotIdx) : key;
      const ext = dotIdx > 0 ? key.slice(dotIdx + 1) : 'jpg';

      const checks: (() => Promise<void>)[] = [
        async () => {
          result.originalExists = await objectExists(r2, cfg.bucket, key);
        },
      ];

      if (cfg.variantType) {
        for (const suffix of ['_sm', '_md', '_lg'] as const) {
          const sizeKey = suffix.slice(1) as 'sm' | 'md' | 'lg';
          checks.push(async () => {
            result.variants[sizeKey] = await objectExists(
              r2,
              cfg.bucket,
              `${baseName}${suffix}.${ext}`,
            );
          });
        }
      }

      await withConcurrency(checks, CONCURRENCY);
      results.push(result);
    }
  }

  const total = count ?? 0;
  const nextCursor = cursor + limit < total ? cursor + limit : null;

  return NextResponse.json({ results, nextCursor, total });
}

// @assumes: full R2 URLs end with the object key after the last '/'
function extractKeyFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1];
}
