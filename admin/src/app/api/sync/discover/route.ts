import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { discoverTeluguMovies, discoverTeluguMoviesByMonth } from '@/lib/tmdb';
import { ensureTmdbApiKey, errorResponse, verifyAdmin } from '@/lib/sync-helpers';

/**
 * POST /api/sync/discover
 * Discover Telugu movies on TMDB by year (and optional month).
 * Returns results + which tmdb_ids already exist in our DB.
 * Read-only — no DB writes.
 */
// @contract: returns { results: TMDBMovie[], existingTmdbIds: number[] }
export async function POST(request: NextRequest) {
  try {
    // @boundary: admin-only — prevents unauthenticated TMDB API usage
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @coupling: ensureTmdbApiKey reads TMDB_API_KEY env var; returns error response if missing
    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    // @nullable: month is optional — omitting it discovers all movies for the entire year
    const { year, month } = body as { year: number; month?: number };

    if (!year || year < 1900 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    // Discover from TMDB
    const results = month
      ? await discoverTeluguMoviesByMonth(year, month, tmdb.apiKey)
      : await discoverTeluguMovies(year, tmdb.apiKey);

    // Batch-check which tmdb_ids already exist in our DB
    // @sync: read-only DB check — no writes, safe for repeated calls
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
