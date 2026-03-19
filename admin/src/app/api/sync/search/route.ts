import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { searchMovies, searchPersons } from '@/lib/tmdb';
import { ensureTmdbApiKey, errorResponse, verifyAdmin } from '@/lib/sync-helpers';

/**
 * POST /api/sync/search
 * Search TMDB for both movies and persons by text query.
 * Cross-references results with DB to mark existing items.
 * @contract Read-only — no DB writes.
 * @contract Returns both movie and actor results in a single response.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    const { query } = body as { query: string };

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // @sideeffect parallel TMDB API calls for movies + persons
    const [movieResults, personResults] = await Promise.all([
      searchMovies(query, tmdb.apiKey),
      searchPersons(query, tmdb.apiKey),
    ]);

    // @sideeffect parallel DB lookups to mark existing items
    const movieTmdbIds = movieResults.map((m) => m.id);
    const personTmdbIds = personResults.map((p) => p.id);

    const [movieExisting, personExisting] = await Promise.all([
      movieTmdbIds.length > 0
        ? supabase.from('movies').select('tmdb_id').in('tmdb_id', movieTmdbIds)
        : { data: [] },
      personTmdbIds.length > 0
        ? supabase.from('actors').select('tmdb_person_id').in('tmdb_person_id', personTmdbIds)
        : { data: [] },
    ]);

    return NextResponse.json({
      movies: {
        results: movieResults,
        existingTmdbIds: (movieExisting.data ?? []).map((r) => r.tmdb_id as number),
      },
      actors: {
        results: personResults,
        existingTmdbPersonIds: (personExisting.data ?? []).map((r) => r.tmdb_person_id as number),
      },
    });
  } catch (err) {
    return errorResponse('Search', err);
  }
}
