import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { processActorRefresh, createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { ensureTmdbApiKey, errorResponse, verifyBearer } from '@/lib/sync-helpers';

/**
 * POST /api/sync/refresh-actor
 * Refresh an existing actor from TMDB by their local actor ID.
 * Looks up tmdb_person_id from the DB, then fetches latest data.
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
    const { actorId } = body as { actorId: string };

    if (!actorId) {
      return NextResponse.json({ error: 'actorId is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Look up tmdb_person_id
    const { data: actor, error: lookupErr } = await supabase
      .from('actors')
      .select('tmdb_person_id, name')
      .eq('id', actorId)
      .single();

    if (lookupErr || !actor) {
      return NextResponse.json({ error: 'Actor not found.' }, { status: 404 });
    }

    if (!actor.tmdb_person_id) {
      return NextResponse.json(
        { error: 'Actor has no TMDB person ID. Cannot refresh from TMDB.' },
        { status: 400 },
      );
    }

    const syncLogId = await createSyncLog(supabase, `refresh-actor`);

    try {
      const result = await processActorRefresh(
        actorId,
        actor.tmdb_person_id,
        tmdb.apiKey,
        supabase,
      );

      await completeSyncLog(supabase, syncLogId, {
        status: 'success',
        moviesUpdated: result.updated ? 1 : 0,
      });

      return NextResponse.json({ syncLogId, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      await completeSyncLog(supabase, syncLogId, {
        status: 'failed',
        errors: [{ actorId, tmdbPersonId: actor.tmdb_person_id, message }],
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    return errorResponse('Refresh actor', err);
  }
}
