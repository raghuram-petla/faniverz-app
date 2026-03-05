import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { discoverTeluguMovies, discoverTeluguMoviesByMonth } from '@/lib/tmdb';

/**
 * POST /api/sync/discover
 * Discover Telugu movies on TMDB by year (and optional month).
 * Returns results + which tmdb_ids already exist in our DB.
 * Read-only — no DB writes.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB_API_KEY is not configured.' }, { status: 503 });
    }

    const body = await request.json();
    const { year, month } = body as { year: number; month?: number };

    if (!year || year < 1900 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    // Discover from TMDB
    const results = month
      ? await discoverTeluguMoviesByMonth(year, month, apiKey)
      : await discoverTeluguMovies(year, apiKey);

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
    console.error('Discover failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discovery failed' },
      { status: 500 },
    );
  }
}
