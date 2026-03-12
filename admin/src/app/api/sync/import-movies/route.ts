import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb, createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { ensureTmdbApiKey, errorResponse } from '@/lib/sync-helpers';

/**
 * POST /api/sync/import-movies
 * Import one or more movies from TMDB by their TMDB IDs.
 * Creates sync_log entries to track progress.
 */
export async function POST(request: NextRequest) {
  try {
    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    const { tmdbIds } = body as { tmdbIds: number[] };

    if (!tmdbIds?.length) {
      return NextResponse.json({ error: 'tmdbIds array is required.' }, { status: 400 });
    }

    // Limit batch size to prevent timeout
    if (tmdbIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 movies per batch. Send multiple requests for larger imports.' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const syncLogId = await createSyncLog(supabase, 'import-movies');

    const results = [];
    const errors: unknown[] = [];
    let added = 0;
    let updated = 0;

    for (const tmdbId of tmdbIds) {
      try {
        const result = await processMovieFromTmdb(tmdbId, tmdb.apiKey, supabase);
        results.push(result);
        if (result.isNew) added++;
        else updated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ tmdbId, message });
      }
    }

    await completeSyncLog(supabase, syncLogId, {
      status: errors.length === 0 ? 'success' : results.length > 0 ? 'success' : 'failed',
      moviesAdded: added,
      moviesUpdated: updated,
      errors,
    });

    return NextResponse.json({ syncLogId, results, errors });
  } catch (err) {
    return errorResponse('Import movies', err);
  }
}
