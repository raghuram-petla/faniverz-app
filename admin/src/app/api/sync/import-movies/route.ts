import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb, createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { ensureTmdbApiKey, errorResponse, verifyAdmin } from '@/lib/sync-helpers';

/**
 * POST /api/sync/import-movies
 * Import one or more movies from TMDB by their TMDB IDs.
 * Creates sync_log entries to track progress.
 */
// @contract: returns { syncLogId, results, errors }; partial success is possible (some movies fail)
// @sideeffect: creates movies, actors, credits, genres in DB; writes sync_log entries
export async function POST(request: NextRequest) {
  try {
    // @boundary: admin-only — import creates significant DB state
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    const { tmdbIds } = body as { tmdbIds: number[] };

    if (!tmdbIds?.length) {
      return NextResponse.json({ error: 'tmdbIds array is required.' }, { status: 400 });
    }

    // Limit batch size to prevent timeout
    // @edge: serverless function timeout — sequential TMDB fetches + DB writes can exceed limit at >5
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

    // @assumes: sequential processing is intentional — TMDB rate limit is 40 requests/10s; parallel fetches risk 429s
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

    // @edge: partial failure (some succeed, some fail) still logs as 'success' — only all-fail is 'failed'
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
