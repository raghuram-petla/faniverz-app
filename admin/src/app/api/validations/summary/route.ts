import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, unauthorizedResponse } from '@/lib/sync-helpers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { SummaryEntry } from '@/hooks/useValidationTypes';

// @contract: TMDB CDN domain used to classify URLs as "external"
const TMDB_DOMAIN = 'image.tmdb.org';

interface ScanConfig {
  table: string;
  field: string;
  label: string;
}

// @coupling: must stay in sync with SCAN_CONFIGS in scan/route.ts
const SCAN_CONFIGS: ScanConfig[] = [
  { table: 'movies', field: 'poster_url', label: 'Movie Posters' },
  { table: 'movies', field: 'backdrop_url', label: 'Movie Backdrops' },
  { table: 'movie_images', field: 'image_url', label: 'Image Gallery' },
  { table: 'actors', field: 'photo_url', label: 'Actor Photos' },
  { table: 'platforms', field: 'logo_url', label: 'Platform Logos' },
  { table: 'production_houses', field: 'logo_url', label: 'Production House Logos' },
  { table: 'profiles', field: 'avatar_url', label: 'User Avatars' },
];

// @boundary: admin-only route — no mutations, read-only summary
export async function GET(request: NextRequest) {
  const user = await verifyAdmin(request.headers.get('authorization'));
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = getSupabaseAdmin();
  const entities: SummaryEntry[] = [];

  // @sideeffect: runs one query per config entry (7 queries total) — sequential, not parallel
  // @edge: each query selects the FULL column for every row; no pagination or count-only optimization.
  // Profiles table with 100k+ users would return 100k rows just to count null vs external URLs.
  for (const config of SCAN_CONFIGS) {
    const { data, error } = await supabase.from(config.table).select(config.field);

    if (error) {
      console.error(`[validations/summary] Error querying ${config.table}.${config.field}:`, error);
      continue;
    }

    let total = 0;
    let external = 0;
    let local = 0;
    let nullCount = 0;

    /* v8 ignore start */
    for (const row of (data as unknown as Record<string, unknown>[]) ?? []) {
      /* v8 ignore stop */

      total++;
      const url = row[config.field] as string | null;
      if (!url) {
        nullCount++;
      } else if (url.startsWith('http') && url.includes(TMDB_DOMAIN)) {
        external++;
      } else {
        local++;
      }
    }

    entities.push({
      entity: config.table,
      field: config.field,
      total,
      external,
      local,
      nullCount,
    });
  }

  return NextResponse.json({ entities });
}
