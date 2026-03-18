import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails, extractTrailerUrl, extractKeyCrewMembers, TMDB_IMAGE } from '@/lib/tmdb';
import { maybeUploadImage, R2_BUCKETS } from '@/lib/r2-sync';
import { ensureTmdbApiKey, errorResponse, verifyAdminCanMutate } from '@/lib/sync-helpers';

/**
 * POST /api/sync/fill-fields
 * Apply admin-selected fields to an existing movie from TMDB.
 * Only updates the fields explicitly requested — all others are untouched.
 * For 'cast': only syncs when the movie currently has zero cast/crew entries.
 *
 * @contract: returns { movieId, updatedFields } — updatedFields lists what
 * actually changed (e.g. 'cast' omitted when movie already had entries).
 */
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
    const tmpKey = String(tmdbId);

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
          // @sideeffect: uploads to R2 with variants; falls back to TMDB URL
          const url = await maybeUploadImage(
            detail.poster_path,
            R2_BUCKETS.moviePosters,
            `${tmpKey}.jpg`,
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
            `${tmpKey}.jpg`,
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
          // @edge: TMDB returns 0 for unknown runtime — treat as null (0 fails app validation)
          updatePayload.runtime = detail.runtime || null;
          updatedFields.push('runtime');
          break;
        case 'genres':
          updatePayload.genres = detail.genres.map((g) => g.name);
          updatedFields.push('genres');
          break;
        // 'cast' is handled separately after the movie update
      }
    }

    // Update movie row (always fires — refreshes tmdb_last_synced_at at minimum)
    const { error: updateErr } = await supabase
      .from('movies')
      .update(updatePayload)
      .eq('id', movieId);
    if (updateErr) throw new Error(`Movie update failed: ${updateErr.message}`);

    // @sideeffect: when poster_url was updated, mirror it into movie_posters so the
    // admin poster gallery stays in sync. Partial unique index on (movie_id) WHERE is_main=true
    // prevents Supabase JS upsert onConflict — use select-then-update/insert instead.
    if (updatedFields.includes('poster_url') && updatePayload.poster_url) {
      const newPosterUrl = updatePayload.poster_url as string;
      const { data: existingMain } = await supabase
        .from('movie_posters')
        .select('id')
        .eq('movie_id', movieId)
        .eq('is_main', true)
        .maybeSingle();
      if (existingMain) {
        await supabase
          .from('movie_posters')
          .update({ image_url: newPosterUrl })
          .eq('id', existingMain.id);
      } else {
        await supabase.from('movie_posters').insert({
          movie_id: movieId,
          image_url: newPosterUrl,
          title: 'Main Poster',
          is_main: true,
          display_order: 0,
        });
      }
    }

    // ── Cast / crew: sync when 'cast' is in fields OR forceResyncCast=true ──────
    // @edge: if movie already has cast, skip unless forceResyncCast=true.
    // forceResyncCast=true: delete-then-reinsert, same as a full refresh.
    // @contract: UI sends forceResyncCast=true but never puts 'cast' in fields[]; both paths lead here.
    if (fields.includes('cast') || forceResyncCast) {
      const { count } = await supabase
        .from('movie_cast')
        .select('*', { count: 'exact', head: true })
        .eq('movie_id', movieId);

      // @sideeffect: when forceResyncCast, deletes all existing cast before reinserting
      if (forceResyncCast && (count ?? 0) > 0) {
        await supabase.from('movie_cast').delete().eq('movie_id', movieId);
      }

      if ((count ?? 0) === 0 || forceResyncCast) {
        const topCast = detail.credits.cast.slice(0, 15);
        for (const cm of topCast) {
          const photoUrl = await maybeUploadImage(
            cm.profile_path,
            R2_BUCKETS.actorPhotos,
            `${cm.id}.jpg`,
            TMDB_IMAGE.profile,
          );
          const { data: actor, error: ae } = await supabase
            .from('actors')
            .upsert(
              {
                tmdb_person_id: cm.id,
                name: cm.name,
                photo_url: photoUrl,
                person_type: 'actor',
                gender: cm.gender ?? null,
              },
              { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
            )
            .select('id')
            .single();
          if (ae) continue;
          await supabase.from('movie_cast').insert({
            movie_id: movieId,
            actor_id: actor.id,
            role_name: cm.character || null,
            display_order: cm.order,
            credit_type: 'cast',
            role_order: null,
          });
        }

        const keyCrew = extractKeyCrewMembers(detail.credits.crew);
        for (const cm of keyCrew) {
          const photoUrl = await maybeUploadImage(
            cm.profile_path,
            R2_BUCKETS.actorPhotos,
            `${cm.id}.jpg`,
            TMDB_IMAGE.profile,
          );
          const { data: actor, error: ae } = await supabase
            .from('actors')
            .upsert(
              {
                tmdb_person_id: cm.id,
                name: cm.name,
                photo_url: photoUrl,
                person_type: 'technician',
                gender: cm.gender ?? null,
              },
              { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
            )
            .select('id')
            .single();
          if (ae) continue;
          await supabase.from('movie_cast').insert({
            movie_id: movieId,
            actor_id: actor.id,
            role_name: cm.roleName,
            display_order: 0,
            credit_type: 'crew',
            role_order: cm.roleOrder,
          });
        }

        updatedFields.push('cast');
      }
    }

    return NextResponse.json({ movieId, updatedFields });
  } catch (err) {
    // @edge: forward TMDB 429 rate-limit errors so useBulkFillMissing can detect
    // and stop the sequential fill loop. The TMDB error message contains "→ 429".
    if (err instanceof Error && err.message.includes('→ 429')) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return errorResponse('Fill fields', err);
  }
}
