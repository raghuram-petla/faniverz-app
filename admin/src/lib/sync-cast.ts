import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails, TMDB_IMAGE } from '@/lib/tmdb';
import { extractKeyCrewMembers } from '@/lib/tmdbTypes';
import { maybeUploadImage, R2_BUCKETS } from '@/lib/r2-sync';
import { upsertActorPreserveType } from '@/lib/sync-actor';

// @sideeffect: mirrors poster_url into movie_images so admin gallery stays in sync
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
  supabase: ReturnType<typeof getSupabaseAdmin>,
  updatedFields: string[],
) {
  const { count } = await supabase
    .from('movie_cast')
    .select('*', { count: 'exact', head: true })
    .eq('movie_id', movieId);

  // @sideeffect: delete existing cast before re-insert when force-resyncing
  if (forceResync && (count ?? 0) > 0) {
    const { error: delErr } = await supabase.from('movie_cast').delete().eq('movie_id', movieId);
    if (delErr) console.warn('syncCastCrew: cast delete failed', delErr.message);
  }

  if ((count ?? 0) === 0 || forceResync) {
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
