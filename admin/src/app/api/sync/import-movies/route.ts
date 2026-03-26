import { NextRequest, NextResponse } from 'next/server';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb, createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { ensureAdminMutateAuth, errorResponse } from '@/lib/sync-helpers';

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
    const guard = await ensureAdminMutateAuth(request.headers.get('authorization'));
    if (!guard.ok) return guard.response;
    const { apiKey, auth } = guard;

    const body = await request.json();
    // @edge: originalLanguage is optional — when provided (from discover results),
    // it enables fetching videos in the movie's native language alongside English.
    const { tmdbIds, originalLanguage } = body as { tmdbIds: number[]; originalLanguage?: string };

    if (!tmdbIds?.length) {
      return NextResponse.json({ error: 'tmdbIds array is required.' }, { status: 400 });
    }

    // @edge: batch size limit — frontend sends 1 movie at a time for resumable imports,
    // but keep safety cap at 5 for backward compatibility
    if (tmdbIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 movies per batch. Send multiple requests for larger imports.' },
        { status: 400 },
      );
    }

    // @contract: auditable client attributes all DB changes to the admin who initiated the import
    const supabase = getAuditableSupabaseAdmin(auth.user.id);
    const syncLogId = await createSyncLog(supabase, 'import-movies');

    const results = [];
    const errors: unknown[] = [];
    let added = 0;
    let updated = 0;

    // @assumes: sequential processing is intentional — TMDB rate limit is 40 requests/10s; parallel fetches risk 429s
    // @contract: resumable=true makes each movie import additive — 504 retries skip already-done items
    for (const tmdbId of tmdbIds) {
      try {
        const result = await processMovieFromTmdb(tmdbId, apiKey, supabase, {
          resumable: true,
          originalLanguage,
        });
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
      details: results.map((r) => r.title),
    });

    return NextResponse.json({ syncLogId, results, errors });
  } catch (err) {
    return errorResponse('Import movies', err);
  }
}
