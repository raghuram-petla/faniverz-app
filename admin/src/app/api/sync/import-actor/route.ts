import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getPersonDetails, TMDB_IMAGE } from '@/lib/tmdb';
import { maybeUploadImage, R2_BUCKETS } from '@/lib/r2-sync';
import { createSyncLog, completeSyncLog } from '@/lib/sync-engine';
import { withSyncAdmin } from '@/lib/route-wrappers';

/**
 * POST /api/sync/import-actor
 * Import an actor directly from TMDB by their TMDB person ID.
 * Creates or updates the actor in the DB with full details (bio, photo, etc).
 * @contract Accepts { tmdbPersonId: number }
 */
export const POST = withSyncAdmin('Import actor', async ({ req, supabase, apiKey }) => {
  const body = await req.json();
  const { tmdbPersonId } = body as { tmdbPersonId: number };

  if (!tmdbPersonId) {
    return NextResponse.json({ error: 'tmdbPersonId is required.' }, { status: 400 });
  }

  const syncLogId = await createSyncLog(supabase, 'import-actor');

  try {
    const person = await getPersonDetails(tmdbPersonId, apiKey);

    // @sideeffect Upload photo to R2 (or fall back to TMDB CDN URL)
    const photoUrl = await maybeUploadImage(
      person.profile_path,
      R2_BUCKETS.actorPhotos,
      `${randomUUID()}.jpg`,
      TMDB_IMAGE.profile,
    );

    // @sideeffect Upsert actor — creates new or updates existing based on tmdb_person_id
    // @edge: upsert overwrites ALL fields (name, bio, photo) — manual edits to an existing actor
    // are silently overwritten on re-import. No merge strategy; TMDB data wins unconditionally.
    const { data: actor, error: upsertErr } = await supabase
      .from('actors')
      .upsert(
        {
          tmdb_person_id: tmdbPersonId,
          name: person.name,
          biography: person.biography,
          place_of_birth: person.place_of_birth,
          birth_date: person.birthday,
          photo_url: photoUrl,
          gender: person.gender ?? null,
          person_type: 'actor',
        },
        { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
      )
      .select('id')
      .single();

    if (upsertErr) throw new Error(`Actor upsert failed: ${upsertErr.message}`);

    await completeSyncLog(supabase, syncLogId, {
      status: 'success',
      moviesAdded: 1,
      details: [person.name],
    });

    return NextResponse.json({
      syncLogId,
      result: { actorId: actor.id, name: person.name, tmdbPersonId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await completeSyncLog(supabase, syncLogId, {
      status: 'failed',
      errors: [{ tmdbPersonId, message }],
    });
    return NextResponse.json({ error: 'Actor import failed' }, { status: 500 });
  }
});
