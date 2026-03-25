import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails, TMDB_IMAGE } from '@/lib/tmdb';
import { extractKeyCrewMembers } from '@/lib/tmdbTypes';
import type { SupabaseClient } from '@supabase/supabase-js';
import { maybeUploadImage, R2_BUCKETS } from '@/lib/r2-sync';
import { upsertActorPreserveType } from '@/lib/sync-actor';

// @sideeffect: mirrors poster_url into movie_images so admin gallery stays in sync
// @coupling: called from refresh-movie API route after poster_url changes — if the route
// forgets to call this, movie_images table gets out of sync with movies.poster_url.
export async function mirrorMainPoster(
  movieId: string,
  posterUrl: string,
  supabase: ReturnType<typeof getSupabaseAdmin>,
) {
  const { data: existingMain } = await supabase
    .from('movie_images')
    .select('id')
    .eq('movie_id', movieId)
    .eq('is_main_poster', true)
    .maybeSingle();
  if (existingMain) {
    const { error } = await supabase
      .from('movie_images')
      .update({ image_url: posterUrl })
      .eq('id', existingMain.id);
    if (error) console.warn('mirrorMainPoster: update failed', error.message);
  } else {
    const { error } = await supabase.from('movie_images').insert({
      movie_id: movieId,
      image_url: posterUrl,
      image_type: 'poster',
      title: 'Main Poster',
      is_main_poster: true,
      display_order: 0,
    });
    if (error) console.warn('mirrorMainPoster: insert failed', error.message);
  }
}

// @contract: syncs ALL cast (no limit) with person_type preservation
export async function syncCastCrew(
  movieId: string,
  detail: Awaited<ReturnType<typeof getMovieDetails>>,
  forceResync: boolean,
  supabase: ReturnType<typeof getSupabaseAdmin> | SupabaseClient,
  updatedFields: string[],
) {
  const { count } = await supabase
    .from('movie_cast')
    .select('*', { count: 'exact', head: true })
    .eq('movie_id', movieId);

  // @sideeffect: delete existing cast before re-insert when force-resyncing
  /* v8 ignore start */
  if (forceResync && (count ?? 0) > 0) {
    /* v8 ignore stop */
    const { error: delErr } = await supabase.from('movie_cast').delete().eq('movie_id', movieId);
    if (delErr) console.warn('syncCastCrew: cast delete failed', delErr.message);
  }

  /* v8 ignore start */
  if ((count ?? 0) === 0 || forceResync) {
    /* v8 ignore stop */
    for (const cm of detail.credits.cast) {
      const photoUrl = await maybeUploadImage(
        cm.profile_path,
        R2_BUCKETS.actorPhotos,
        `${randomUUID()}.jpg`,
        TMDB_IMAGE.profile,
      );
      const actorId = await upsertActorPreserveType(supabase, {
        tmdb_person_id: cm.id,
        name: cm.name,
        photo_url: photoUrl,
        default_person_type: 'actor',
        gender: cm.gender ?? null,
      });
      if (!actorId) continue;
      const { error: castErr } = await supabase.from('movie_cast').insert({
        movie_id: movieId,
        actor_id: actorId,
        role_name: cm.character || null,
        display_order: cm.order,
        credit_type: 'cast',
        role_order: null,
      });
      if (castErr)
        console.warn(`syncCastCrew: cast insert failed for ${cm.name}:`, castErr.message);
    }

    const keyCrew = extractKeyCrewMembers(detail.credits.crew);
    for (const cm of keyCrew) {
      const photoUrl = await maybeUploadImage(
        cm.profile_path,
        R2_BUCKETS.actorPhotos,
        `${randomUUID()}.jpg`,
        TMDB_IMAGE.profile,
      );
      const actorId = await upsertActorPreserveType(supabase, {
        tmdb_person_id: cm.id,
        name: cm.name,
        photo_url: photoUrl,
        default_person_type: 'technician',
        gender: cm.gender ?? null,
      });
      if (!actorId) continue;
      const { error: crewErr } = await supabase.from('movie_cast').insert({
        movie_id: movieId,
        actor_id: actorId,
        role_name: cm.roleName,
        display_order: 0,
        credit_type: 'crew',
        role_order: cm.roleOrder,
      });
      if (crewErr)
        console.warn(`syncCastCrew: crew insert failed for ${cm.name}:`, crewErr.message);
    }

    updatedFields.push('cast');
  }
}

// ── Additive (resumable) cast/crew sync ────────────────────────────────────

/** @contract: query existing cast keys for a given movie+credit_type. For cast, key
 * is tmdb_person_id. For crew, key is `${tmdb_person_id}-${role_order}` because one
 * person can hold multiple crew roles (e.g., Director + Writer). */
async function getExistingCastKeys(
  supabase: SupabaseClient,
  movieId: string,
  creditType: 'cast' | 'crew',
): Promise<Set<string>> {
  // @edge: if query fails, return empty set — caller treats all items as missing (safe, just redundant uploads)
  const { data, error } = await supabase
    .from('movie_cast')
    .select('role_order, actors!inner(tmdb_person_id)')
    .eq('movie_id', movieId)
    .eq('credit_type', creditType);
  if (error) console.warn('getExistingCastKeys: query failed', error.message);
  // @edge: Supabase returns actors as object (not array) due to !inner join
  return new Set(
    (data ?? []).map((r) => {
      const personId = (r.actors as unknown as { tmdb_person_id: number }).tmdb_person_id;
      // @contract: crew uses composite key to support multi-role (Director + Writer)
      return creditType === 'crew' ? `${personId}-${r.role_order}` : String(personId);
    }),
  );
}

/**
 * Additive cast/crew sync — only processes missing members, skips already-synced.
 * R2 uploads sequential (batch 1 to avoid DNS EBUSY on Vercel free plan).
 * Cleans up stale entries only when ALL members are processed (function completes).
 *
 * @sideeffect: uploads actor photos to R2, upserts actors, inserts movie_cast rows.
 * @contract: used by resumable import to survive 504 timeouts — each retry makes progress.
 */
export async function syncCastCrewAdditive(
  movieId: string,
  detail: Awaited<ReturnType<typeof getMovieDetails>>,
  supabase: SupabaseClient,
): Promise<{ castCount: number; crewCount: number }> {
  // ── Cast ──
  const existingCastKeys = await getExistingCastKeys(supabase, movieId, 'cast');
  const allCast = detail.credits.cast;
  const missingCast = allCast.filter((cm) => !existingCastKeys.has(String(cm.id)));
  let castCount = allCast.length - missingCast.length;

  // @sideeffect: process missing cast sequentially (batch 1 to avoid DNS EBUSY)
  for (let i = 0; i < missingCast.length; i += 1) {
    const batch = missingCast.slice(i, i + 1);
    const batchResults = await Promise.all(
      batch.map(async (cm) => {
        const photoUrl = await maybeUploadImage(
          cm.profile_path,
          R2_BUCKETS.actorPhotos,
          `${randomUUID()}.jpg`,
          TMDB_IMAGE.profile,
        );
        const actorId = await upsertActorPreserveType(supabase, {
          tmdb_person_id: cm.id,
          name: cm.name,
          photo_url: photoUrl,
          default_person_type: 'actor',
          gender: cm.gender ?? null,
        });
        if (!actorId) return { ok: false };
        const { error } = await supabase.from('movie_cast').insert({
          movie_id: movieId,
          actor_id: actorId,
          /* v8 ignore start */
          role_name: cm.character || null,
          /* v8 ignore stop */
          display_order: cm.order,
          credit_type: 'cast',
          role_order: null,
        });
        const isDupe = error?.message?.includes('unique constraint');
        if (error && !isDupe)
          console.warn(`syncCastCrewAdditive: cast insert failed for ${cm.name}`, error.message);
        return { ok: !error || isDupe };
      }),
    );
    // @contract: count successes after batch completes to avoid race on shared counter
    castCount += batchResults.filter((r) => r?.ok).length;
  }

  // ── Crew ──
  // @contract: crew uses composite key `${person_id}-${roleOrder}` to support multi-role
  const existingCrewKeys = await getExistingCastKeys(supabase, movieId, 'crew');
  const keyCrew = extractKeyCrewMembers(detail.credits.crew);
  const missingCrew = keyCrew.filter((cm) => !existingCrewKeys.has(`${cm.id}-${cm.roleOrder}`));
  let crewCount = keyCrew.length - missingCrew.length;

  for (let i = 0; i < missingCrew.length; i += 1) {
    const batch = missingCrew.slice(i, i + 1);
    const crewResults = await Promise.all(
      batch.map(async (cm) => {
        const photoUrl = await maybeUploadImage(
          cm.profile_path,
          R2_BUCKETS.actorPhotos,
          `${randomUUID()}.jpg`,
          TMDB_IMAGE.profile,
        );
        const actorId = await upsertActorPreserveType(supabase, {
          tmdb_person_id: cm.id,
          name: cm.name,
          photo_url: photoUrl,
          default_person_type: 'technician',
          /* v8 ignore start */
          gender: cm.gender ?? null,
          /* v8 ignore stop */
        });
        if (!actorId) return { ok: false };
        // @edge: same person can have multiple TMDB roles (Director + Writer) but
        // UNIQUE(movie_id, actor_id, credit_type) allows only one — silently skip duplicates
        const { error } = await supabase.from('movie_cast').insert({
          movie_id: movieId,
          actor_id: actorId,
          role_name: cm.roleName,
          display_order: 0,
          credit_type: 'crew',
          role_order: cm.roleOrder,
        });
        const isDupe = error?.message?.includes('unique constraint');
        if (error && !isDupe)
          console.warn(`syncCastCrewAdditive: crew insert failed for ${cm.name}`, error.message);
        return { ok: !error || isDupe };
      }),
    );
    crewCount += crewResults.filter((r) => r?.ok).length;
  }

  // @sideeffect: cleanup stale cast/crew entries not in current TMDB data
  const allTmdbPersonIds = new Set([...allCast.map((c) => c.id), ...keyCrew.map((c) => c.id)]);
  const { data: existingAll } = await supabase
    .from('movie_cast')
    .select('id, actor_id, actors!inner(tmdb_person_id)')
    .eq('movie_id', movieId);
  const staleIds = (existingAll ?? [])
    .filter(
      (r) =>
        !allTmdbPersonIds.has((r.actors as unknown as { tmdb_person_id: number }).tmdb_person_id),
    )
    .map((r) => r.id as string);
  if (staleIds.length > 0) {
    await supabase.from('movie_cast').delete().in('id', staleIds);
  }

  return { castCount, crewCount };
}
