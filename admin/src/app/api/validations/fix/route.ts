import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdminCanMutate } from '@/lib/sync-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getR2Client } from '@/lib/r2-client';
import { uploadImageFromUrl } from '@/lib/r2-sync';
import { generateVariants } from '@/lib/image-resize';
import { VARIANT_SPECS } from '@/lib/variant-config';
import type { FixItem, FixResult } from '@/hooks/useValidationTypes';
import type { VariantType } from '@/lib/variant-config';

const MAX_ITEMS = 20;

// @coupling: must match bucket-to-variantType mapping in scan/route.ts
const BUCKET_VARIANT_MAP: Record<string, VariantType> = {
  'faniverz-movie-posters': 'poster',
  'faniverz-movie-backdrops': 'backdrop',
  'faniverz-actor-photos': 'photo',
  'faniverz-profile-avatars': 'avatar',
};

// @coupling: must match entity→bucket mapping in scan/route.ts
const ENTITY_FIELD_BUCKET: Record<string, Record<string, string>> = {
  movies: {
    poster_url: 'faniverz-movie-posters',
    backdrop_url: 'faniverz-movie-backdrops',
  },
  movie_posters: { image_url: 'faniverz-movie-posters' },
  actors: { photo_url: 'faniverz-actor-photos' },
  platforms: { logo_url: 'faniverz-platform-logos' },
  production_houses: { logo_url: 'faniverz-production-house-logos' },
  profiles: { avatar_url: 'faniverz-profile-avatars' },
};

// @contract: extracts the TMDB path from a full TMDB CDN URL
// e.g. "https://image.tmdb.org/t/p/w500/abc123.jpg" → "/abc123.jpg"
function extractTmdbPath(url: string): string | null {
  const match = url.match(/image\.tmdb\.org\/t\/p\/\w+(\/.+)$/);
  return match?.[1] ?? null;
}

// @boundary: mutation endpoint — requires non-viewer admin role
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminCanMutate(request.headers.get('authorization'));
  if (authResult === 'viewer_readonly') {
    return NextResponse.json({ error: 'Read-only access' }, { status: 403 });
  }
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const items = body.items as FixItem[];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Maximum ${MAX_ITEMS} items per request` }, { status: 400 });
  }

  const r2 = getR2Client();
  if (!r2) {
    return NextResponse.json({ error: 'R2 storage is not configured' }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  const results: FixResult[] = [];

  for (const item of items) {
    try {
      const bucket = ENTITY_FIELD_BUCKET[item.entity]?.[item.field];
      if (!bucket) {
        results.push({
          id: item.id,
          field: item.field,
          status: 'failed',
          error: 'Unknown entity/field',
        });
        continue;
      }

      if (item.fixType === 'migrate_external') {
        const newUrl = await handleMigrateExternal(r2, supabase, item, bucket);
        results.push({ id: item.id, field: item.field, status: 'fixed', newUrl });
      } else if (item.fixType === 'regenerate_variants') {
        await handleRegenerateVariants(r2, item, bucket);
        results.push({ id: item.id, field: item.field, status: 'fixed' });
      } else {
        results.push({
          id: item.id,
          field: item.field,
          status: 'failed',
          error: 'Unknown fixType',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[validations/fix] Error fixing ${item.id}.${item.field}:`, msg);
      results.push({ id: item.id, field: item.field, status: 'failed', error: msg });
    }
  }

  return NextResponse.json({ results });
}

// @sideeffect: downloads from TMDB, uploads to R2, updates DB
async function handleMigrateExternal(
  r2: NonNullable<ReturnType<typeof getR2Client>>,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  item: FixItem,
  bucket: string,
): Promise<string> {
  const tmdbPath = extractTmdbPath(item.currentUrl);
  if (!tmdbPath) throw new Error('Cannot extract TMDB path from URL');

  // @contract: use original quality for max resolution download
  const sourceUrl = `https://image.tmdb.org/t/p/original${tmdbPath}`;
  const key = tmdbPath.slice(1); // Remove leading '/'

  const newUrl = await uploadImageFromUrl(sourceUrl, bucket, key);

  // @sideeffect: updates the DB column with the new relative key
  const { error } = await supabase
    .from(item.entity)
    .update({ [item.field]: newUrl })
    .eq('id', item.id);

  if (error) throw new Error(`DB update failed: ${error.message}`);
  return newUrl;
}

// @sideeffect: downloads original from R2, regenerates variants, uploads them
async function handleRegenerateVariants(
  r2: NonNullable<ReturnType<typeof getR2Client>>,
  item: FixItem,
  bucket: string,
): Promise<void> {
  const key = item.currentUrl.startsWith('http')
    ? item.currentUrl.split('/').pop()!
    : item.currentUrl;

  const dotIdx = key.lastIndexOf('.');
  const baseName = dotIdx > 0 ? key.slice(0, dotIdx) : key;
  const ext = dotIdx > 0 ? key.slice(dotIdx + 1) : 'jpg';

  // Download original from R2
  const getResult = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bodyBytes = await getResult.Body?.transformToByteArray();
  if (!bodyBytes) throw new Error('Original image not found in R2');

  const buffer = Buffer.from(bodyBytes);
  const contentType = getResult.ContentType ?? 'image/jpeg';

  const variantType = BUCKET_VARIANT_MAP[bucket];
  if (!variantType) throw new Error(`No variant config for bucket: ${bucket}`);

  const specs = VARIANT_SPECS[variantType];
  const variants = await generateVariants(buffer, contentType, specs);

  // @sideeffect: uploads all variant files in parallel
  await Promise.all(
    variants.map((v) =>
      r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${baseName}${v.suffix}.${ext}`,
          Body: v.buffer,
          ContentType: v.contentType,
        }),
      ),
    ),
  );
}
