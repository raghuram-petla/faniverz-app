import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails, TMDB_IMAGE } from '@/lib/tmdb';
import {
  extractTrailerUrl,
  extractKeyCrewMembers,
  extractTeluguTranslation,
  extractIndiaCertification,
} from '@/lib/tmdbTypes';
import { maybeUploadImage, R2_BUCKETS } from '@/lib/r2-sync';
import { ensureTmdbApiKey, errorResponse, verifyAdminCanMutate } from '@/lib/sync-helpers';
import { syncAllImages } from '@/lib/sync-images';
import {
  syncVideos,
  syncWatchProviders,
  syncKeywords,
  syncProductionCompanies,
} from '@/lib/sync-extended';
import { upsertActorPreserveType } from '@/lib/sync-actor';

/** POST /api/sync/fill-fields — apply admin-selected TMDB fields to an existing movie.
 * @contract: returns { movieId, updatedFields } — only lists what actually changed. */
// @sideeffect: updates movies row + optionally inserts actors + movie_cast rows
// @assumes: tmdb_id has UNIQUE constraint; movie must already exist in DB
export async function POST(request: NextRequest) {
  try {
    // @boundary: viewer role is read-only
    const auth = await verifyAdminCanMutate(request.headers.get('authorization'));
    if (auth === 'viewer_readonly')
      return NextResponse.json({ error: 'Viewer role is read-only' }, { status: 403 });
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const { tmdbId, fields, forceResyncCast } = (await request.json()) as {
      tmdbId: number;
      fields: string[];
      forceResyncCast?: boolean;
    };
    // @edge: allow fields=[] when forceResyncCast=true — cast-only re-sync is a valid use case
    if (!tmdbId || !Array.isArray(fields) || (fields.length === 0 && !forceResyncCast)) {
      return NextResponse.json({ error: 'tmdbId and fields[] are required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', tmdbId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Movie not found in DB.' }, { status: 404 });
    const movieId = existing.id as string;

    const detail = await getMovieDetails(tmdbId, tmdb.apiKey);

    // @contract: extract Telugu translation once (used by title_te / synopsis_te cases below)
    const { titleTe, synopsisTe } = extractTeluguTranslation(detail.translations);

    // @invariant: tmdb_last_synced_at always refreshed regardless of which
    // fields were requested — signals that this movie was reviewed by an admin.
    const updatePayload: Record<string, unknown> = {
      tmdb_last_synced_at: new Date().toISOString(),
    };
    const updatedFields: string[] = [];

    // ── Build payload for each requested field ────────────────────────────────
    for (const field of fields) {
      switch (field) {
        case 'title':
          updatePayload.title = detail.title;
          updatedFields.push('title');
          break;
        case 'synopsis':
          updatePayload.synopsis = detail.overview || null;
          updatedFields.push('synopsis');
          break;
        case 'poster_url': {
          const url = await maybeUploadImage(
            detail.poster_path,
            R2_BUCKETS.moviePosters,
            `${randomUUID()}.jpg`,
            TMDB_IMAGE.poster,
          );
          updatePayload.poster_url = url;
          updatedFields.push('poster_url');
          break;
        }
        case 'backdrop_url': {
          const url = await maybeUploadImage(
            detail.backdrop_path,
            R2_BUCKETS.movieBackdrops,
            `${randomUUID()}.jpg`,
            TMDB_IMAGE.backdrop,
          );
          updatePayload.backdrop_url = url;
          updatedFields.push('backdrop_url');
          break;
        }
        case 'trailer_url':
          updatePayload.trailer_url = extractTrailerUrl(detail.videos.results);
          updatedFields.push('trailer_url');
          break;
        case 'director':
          updatePayload.director =
            detail.credits.crew.find((c) => c.job === 'Director')?.name ?? null;
          updatedFields.push('director');
          break;
        case 'runtime':
          updatePayload.runtime = detail.runtime || null;
          updatedFields.push('runtime');
          break;
        case 'genres':
          updatePayload.genres = detail.genres.map((g) => g.name);
          updatedFields.push('genres');
          break;
        case 'imdb_id':
          updatePayload.imdb_id = detail.external_ids?.imdb_id ?? null;
          if (updatePayload.imdb_id) updatedFields.push('imdb_id');
          break;
        case 'title_te':
          if (titleTe) {
            updatePayload.title_te = titleTe;
            updatedFields.push('title_te');
          }
          break;
        case 'synopsis_te':
          if (synopsisTe) {
            updatePayload.synopsis_te = synopsisTe;
            updatedFields.push('synopsis_te');
          }
          break;
        // @contract: new TMDB metadata fields
        case 'tagline':
          updatePayload.tagline = detail.tagline || null;
          if (detail.tagline) updatedFields.push('tagline');
          break;
        case 'tmdb_status':
          updatePayload.tmdb_status = detail.status || null;
          if (detail.status) updatedFields.push('tmdb_status');
          break;
        case 'tmdb_ratings':
          updatePayload.tmdb_vote_average = detail.vote_average ?? null;
          updatePayload.tmdb_vote_count = detail.vote_count ?? null;
          updatedFields.push('tmdb_ratings');
          break;
        case 'budget_revenue':
          // @edge: TMDB returns 0 for unknown budget/revenue — treat as null
          updatePayload.budget = detail.budget || null;
          updatePayload.revenue = detail.revenue || null;
          updatedFields.push('budget_revenue');
          break;
        case 'certification_auto': {
          const cert = extractIndiaCertification(detail.release_dates);
          if (cert) {
            updatePayload.certification = cert;
            updatedFields.push('certification_auto');
          }
          break;
        }
        case 'spoken_languages':
          updatePayload.spoken_languages = detail.spoken_languages?.map((l) => l.iso_639_1) ?? null;
          if (detail.spoken_languages?.length) updatedFields.push('spoken_languages');
          break;
        // 'cast', 'images', 'videos', 'watch_providers', 'keywords', 'production_companies' handled after
      }
    }

    // Update movie row (always fires — refreshes tmdb_last_synced_at at minimum)
    const { error: updateErr } = await supabase
      .from('movies')
      .update(updatePayload)
      .eq('id', movieId);
    if (updateErr) throw new Error(`Movie update failed: ${updateErr.message}`);

    // @sideeffect: when poster_url was updated, mirror into movie_images
    if (updatedFields.includes('poster_url') && updatePayload.poster_url) {
      await mirrorMainPoster(movieId, updatePayload.poster_url as string, supabase);
    }

    // ── Extended sync: images, videos, watch providers, keywords, production companies
    if (fields.includes('images')) {
      const { posterCount, backdropCount } = await syncAllImages(
        movieId,
        tmdbId,
        tmdb.apiKey,
        supabase,
      );
      if (posterCount > 0 || backdropCount > 0) updatedFields.push('images');
    }
    if (fields.includes('videos')) {
      const c = await syncVideos(movieId, detail.videos.results, supabase);
      if (c > 0) updatedFields.push('videos');
    }
    if (fields.includes('watch_providers')) {
      const c = await syncWatchProviders(movieId, tmdbId, tmdb.apiKey, supabase);
      if (c > 0) updatedFields.push('watch_providers');
    }
    if (fields.includes('keywords')) {
      const c = await syncKeywords(movieId, detail, supabase);
      if (c > 0) updatedFields.push('keywords');
    }
    if (fields.includes('production_companies')) {
      const c = await syncProductionCompanies(movieId, detail.production_companies ?? [], supabase);
      if (c > 0) updatedFields.push('production_companies');
    }

    // ── Cast / crew sync ──────────────────────────────────────────────────────
    if (fields.includes('cast') || forceResyncCast) {
      await syncCastCrew(movieId, detail, forceResyncCast ?? false, supabase, updatedFields);
    }

    return NextResponse.json({ movieId, updatedFields });
  } catch (err) {
    if (err instanceof Error && err.message.includes('→ 429')) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return errorResponse('Fill fields', err);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// @sideeffect: mirrors poster_url into movie_images so admin gallery stays in sync
async function mirrorMainPoster(
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
async function syncCastCrew(
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
