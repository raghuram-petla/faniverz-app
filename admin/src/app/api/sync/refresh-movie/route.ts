import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb, createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { ensureTmdbApiKey, errorResponse, verifyAdmin } from '@/lib/sync-helpers';

/**
 * POST /api/sync/refresh-movie
 * Refresh an existing movie from TMDB by its local movie ID.
 * Looks up tmdb_id from the DB, then re-syncs all data.
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
    const { movieId } = body as { movieId: string };

    if (!movieId) {
      return NextResponse.json({ error: 'movieId is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Look up tmdb_id
    const { data: movie, error: lookupErr } = await supabase
      .from('movies')
      .select('tmdb_id, title')
      .eq('id', movieId)
      .single();

    if (lookupErr || !movie) {
      return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
    }

    if (!movie.tmdb_id) {
      return NextResponse.json(
        { error: 'Movie has no TMDB ID. Cannot refresh from TMDB.' },
        { status: 400 },
      );
    }

    const syncLogId = await createSyncLog(supabase, `refresh-movie`);

    try {
      const result = await processMovieFromTmdb(movie.tmdb_id, tmdb.apiKey, supabase);

      await completeSyncLog(supabase, syncLogId, {
        status: 'success',
        moviesUpdated: 1,
      });

      return NextResponse.json({ syncLogId, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      await completeSyncLog(supabase, syncLogId, {
        status: 'failed',
        errors: [{ movieId, tmdbId: movie.tmdb_id, message }],
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    return errorResponse('Refresh movie', err);
  }
}
