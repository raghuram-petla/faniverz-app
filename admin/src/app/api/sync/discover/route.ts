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
// @contract: returns { results: TMDBMovie[], existingMovies: ExistingMovieData[] }
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

    // Batch-check which tmdb_ids already exist in our DB, fetching all
    // fillable fields so the frontend can show a field-level diff without
    // a separate per-movie query.
    // @sync: read-only DB check — no writes, safe for repeated calls
    const tmdbIds = results.map((m) => m.id);
    const supabase = getSupabaseAdmin();
    const { data: existingRows } = await supabase
      .from('movies')
      .select(
        'id, tmdb_id, title, synopsis, poster_url, backdrop_url, trailer_url, director, runtime, genres, imdb_id, title_te, synopsis_te, tagline, tmdb_status, tmdb_vote_average, tmdb_vote_count, budget, revenue, certification, spoken_languages',
      )
      .in('tmdb_id', tmdbIds);

    // @contract: resolve relative R2 keys to full URLs server-side so client components
    // can use poster_url directly without needing env vars (Turbopack doesn't substitute
    // process.env in client bundles for non-NEXT_PUBLIC_ vars)
    const postersBase = process.env.R2_PUBLIC_BASE_URL_POSTERS?.replace(/\/$/, '');
    const existingMovies = (existingRows ?? []).map((row) => ({
      ...row,
      poster_url:
        row.poster_url && !row.poster_url.startsWith('http') && postersBase
          ? `${postersBase}/${row.poster_url}`
          : row.poster_url,
    }));

    // @sideeffect check for title-based duplicates — movies in DB with matching titles but no tmdb_id
    const existingTmdbIds = new Set(existingMovies.map((m) => m.tmdb_id));
    const unmatchedTitles = results.filter((m) => !existingTmdbIds.has(m.id)).map((m) => m.title);
    let duplicateSuspects: Record<number, { id: string; title: string }> = {};
    if (unmatchedTitles.length > 0) {
      const { data: suspects } = await supabase
        .from('movies')
        .select('id, title, tmdb_id')
        .is('tmdb_id', null)
        .in('title', unmatchedTitles);
      if (suspects && suspects.length > 0) {
        const suspectMap = new Map(suspects.map((s) => [s.title.toLowerCase(), s]));
        for (const m of results) {
          const match = suspectMap.get(m.title.toLowerCase());
          if (match) duplicateSuspects[m.id] = { id: match.id, title: match.title };
        }
      }
    }

    return NextResponse.json({ results, existingMovies, duplicateSuspects });
  } catch (err) {
    return errorResponse('Discover', err);
  }
}
