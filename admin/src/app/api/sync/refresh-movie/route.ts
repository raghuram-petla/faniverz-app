import { NextResponse } from 'next/server';
import { processMovieFromTmdb, createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { withSyncAdmin } from '@/lib/route-wrappers';

/**
 * POST /api/sync/refresh-movie
 * Refresh an existing movie from TMDB by its local movie ID.
 * Looks up tmdb_id from the DB, then re-syncs all data.
 */
// @contract: accepts { movieId: UUID }; returns { syncLogId, result } on success
// @sideeffect: overwrites movie + related credits/genres with latest TMDB data; writes sync_log
export const POST = withSyncAdmin('Refresh movie', async ({ req, supabase, apiKey }) => {
  const body = await req.json();
  // @assumes: movieId is a local UUID, not a TMDB ID
  const { movieId } = body as { movieId: string };

  if (!movieId) {
    return NextResponse.json({ error: 'movieId is required.' }, { status: 400 });
  }

  // Look up tmdb_id
  const { data: movie, error: lookupErr } = await supabase
    .from('movies')
    .select('tmdb_id, title')
    .eq('id', movieId)
    .single();

  if (lookupErr || !movie) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  // @edge: manually-created movies (no TMDB link) cannot be refreshed
  if (!movie.tmdb_id) {
    return NextResponse.json(
      { error: 'Movie has no TMDB ID. Cannot refresh from TMDB.' },
      { status: 400 },
    );
  }

  const syncLogId = await createSyncLog(supabase, `refresh-movie`);

  try {
    const result = await processMovieFromTmdb(movie.tmdb_id, apiKey, supabase);

    await completeSyncLog(supabase, syncLogId, {
      status: 'success',
      moviesUpdated: 1,
      details: [movie.title],
    });

    return NextResponse.json({ syncLogId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // @sideeffect: sync_log completed as 'failed' — preserves audit trail on error
    await completeSyncLog(supabase, syncLogId, {
      status: 'failed',
      errors: [{ movieId, tmdbId: movie.tmdb_id, message }],
    });

    return NextResponse.json({ error: 'Movie refresh failed' }, { status: 500 });
  }
});
