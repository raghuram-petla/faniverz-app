import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { discoverTeluguMovies, discoverTeluguMoviesByMonth } from '@/lib/tmdb';
import { ensureTmdbApiKey, errorResponse, verifyBearer } from '@/lib/sync-helpers';

/**
 * POST /api/sync/discover
 * Discover Telugu movies on TMDB by year (and optional month).
 * Returns results + which tmdb_ids already exist in our DB.
 * Read-only — no DB writes.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyBearer(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    const { year, month } = body as { year: number; month?: number };

    if (!year || year < 1900 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    // Discover from TMDB
    const results = month
      ? await discoverTeluguMoviesByMonth(year, month, tmdb.apiKey)
      : await discoverTeluguMovies(year, tmdb.apiKey);

    // Batch-check which tmdb_ids already exist in our DB
    const tmdbIds = results.map((m) => m.id);
    const supabase = getSupabaseAdmin();
    const { data: existingRows } = await supabase
      .from('movies')
      .select('tmdb_id')
      .in('tmdb_id', tmdbIds);

    const existingTmdbIds = (existingRows ?? []).map((r) => r.tmdb_id as number);

    return NextResponse.json({ results, existingTmdbIds });
  } catch (err) {
    return errorResponse('Discover', err);
  }
}
