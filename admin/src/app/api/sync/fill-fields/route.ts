import { NextResponse } from 'next/server';
import { getMovieDetails } from '@/lib/tmdb';
import { extractTeluguTranslation, extractIndiaCertification } from '@/lib/tmdbTypes';
import { maybeUploadImage, R2_BUCKETS } from '@/lib/r2-sync';
import { TMDB_IMAGE } from '@/lib/tmdb';
import { syncAllImages } from '@/lib/sync-images';
import { syncVideos, syncKeywords, syncProductionCompanies } from '@/lib/sync-extended';
import { syncWatchProvidersMultiCountry } from '@/lib/sync-watch-providers';
import { syncCastCrewAdditive } from '@/lib/sync-cast';
import { withSyncAdmin } from '@/lib/route-wrappers';
import { safeDateOrNull } from '@/lib/utils';
import { randomUUID } from 'crypto';

/**
 * POST /api/sync/fill-fields — apply selected TMDB fields to an existing movie.
 *
 * @contract: uses the SAME shared sync functions as processMovieFromTmdb (import),
 * but only runs the operations for the REQUESTED fields. This avoids unnecessary
 * work (no full cast sync for an image gap) and lets errors propagate properly
 * instead of being silently swallowed.
 *
 * Single source of truth: syncAllImages, syncVideos, syncCastCrewAdditive, etc.
 * are shared between import-movies and fill-fields.
 */
// @sideeffect: updates movie row and/or junction tables based on requested fields
// @assumes: movie must already exist in DB with a valid tmdb_id
export const POST = withSyncAdmin('Fill fields', async ({ req, supabase, apiKey }) => {
  try {
    const { tmdbId, fields, forceResyncCast } = (await req.json()) as {
      tmdbId: number;
      fields: string[];
      forceResyncCast?: boolean;
    };
    // @edge: allow fields=[] when forceResyncCast=true — cast-only re-sync is valid
    if (!tmdbId || !Array.isArray(fields) || (fields.length === 0 && !forceResyncCast)) {
      return NextResponse.json({ error: 'tmdbId and fields[] are required.' }, { status: 400 });
    }

    // @contract: verify movie exists and read original_language for native-lang fetching
    const { data: existing } = await supabase
      .from('movies')
      .select('id, original_language')
      .eq('tmdb_id', tmdbId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Movie not found in DB.' }, { status: 404 });

    const movieId = existing.id as string;
    const originalLanguage =
      existing.original_language && existing.original_language !== 'en'
        ? existing.original_language
        : undefined;

    // @contract: fetch TMDB detail once — shared by all field handlers below
    const detail = await getMovieDetails(tmdbId, apiKey, originalLanguage);
    const fieldSet = new Set(fields);
    const updatedFields: string[] = [];

    // ── Scalar field updates (direct movie row update) ──────────────────────
    // @contract: only build update payload for requested fields
    const movieUpdate: Record<string, unknown> = {};
    const { titleTe, synopsisTe } = extractTeluguTranslation(detail.translations);

    if (fieldSet.has('title')) movieUpdate.title = detail.title;
    /* v8 ignore start */
    if (fieldSet.has('synopsis')) movieUpdate.synopsis = detail.overview || null;
    /* v8 ignore stop */
    /* v8 ignore start */
    if (fieldSet.has('release_date'))
      movieUpdate.release_date = safeDateOrNull(detail.release_date);
    /* v8 ignore stop */
    if (fieldSet.has('director')) {
      /* v8 ignore start */
      movieUpdate.director = detail.credits.crew.find((c) => c.job === 'Director')?.name ?? null;
      /* v8 ignore stop */
    }
    /* v8 ignore start */
    if (fieldSet.has('runtime')) movieUpdate.runtime = detail.runtime || null;
    /* v8 ignore stop */

    if (fieldSet.has('genres')) movieUpdate.genres = detail.genres.map((g) => g.name);
    if (fieldSet.has('imdb_id')) movieUpdate.imdb_id = detail.external_ids?.imdb_id ?? null;
    if (fieldSet.has('title_te') && titleTe) movieUpdate.title_te = titleTe;
    if (fieldSet.has('synopsis_te') && synopsisTe) movieUpdate.synopsis_te = synopsisTe;
    /* v8 ignore start */
    if (fieldSet.has('tagline')) movieUpdate.tagline = detail.tagline || null;
    /* v8 ignore stop */
    /* v8 ignore start */
    if (fieldSet.has('tmdb_status')) movieUpdate.tmdb_status = detail.status || null;
    /* v8 ignore stop */
    if (fieldSet.has('tmdb_ratings')) {
      /* v8 ignore start */
      movieUpdate.tmdb_vote_average = detail.vote_average ?? null;
      /* v8 ignore stop */
      /* v8 ignore start */
      movieUpdate.tmdb_vote_count = detail.vote_count ?? null;
      /* v8 ignore stop */
    }
    if (fieldSet.has('budget_revenue')) {
      /* v8 ignore start */
      movieUpdate.budget = detail.budget || null;
      /* v8 ignore stop */
      /* v8 ignore start */
      movieUpdate.revenue = detail.revenue || null;
      /* v8 ignore stop */
    }
    if (fieldSet.has('certification_auto')) {
      const cert = extractIndiaCertification(detail.release_dates);
      if (cert) movieUpdate.certification = cert;
    }
    if (fieldSet.has('spoken_languages')) {
      movieUpdate.spoken_languages = detail.spoken_languages?.map((l) => l.iso_639_1) ?? null;
    }
    // @sideeffect: poster/backdrop — upload to R2 and update movie row
    if (fieldSet.has('poster_url') && detail.poster_path) {
      const posterUrl = await maybeUploadImage(
        detail.poster_path,
        R2_BUCKETS.moviePosters,
        `${randomUUID()}.jpg`,
        TMDB_IMAGE.poster,
      );
      if (posterUrl) movieUpdate.poster_url = posterUrl;
    }
    if (fieldSet.has('backdrop_url') && detail.backdrop_path) {
      const backdropUrl = await maybeUploadImage(
        detail.backdrop_path,
        R2_BUCKETS.movieBackdrops,
        `${randomUUID()}.jpg`,
        TMDB_IMAGE.backdrop,
      );
      if (backdropUrl) movieUpdate.backdrop_url = backdropUrl;
    }

    // @contract: scalar fields that map to compound update keys
    const COMPOUND_FIELDS: Record<string, string> = {
      tmdb_ratings: 'tmdb_vote_average',
      budget_revenue: 'budget',
      certification_auto: 'certification',
    };

    // Apply scalar updates in a single DB call
    if (Object.keys(movieUpdate).length > 0) {
      movieUpdate.tmdb_last_synced_at = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('movies')
        .update(movieUpdate)
        .eq('id', movieId);
      if (updateErr) throw new Error(`Movie update failed: ${updateErr.message}`);
      // @contract: track which requested fields were in the update
      const JUNCTION_FIELDS = [
        'images',
        'videos',
        'watch_providers',
        'keywords',
        'production_companies',
        'cast',
      ];
      for (const f of fields) {
        if (JUNCTION_FIELDS.includes(f)) continue;
        const dbKey = COMPOUND_FIELDS[f] ?? f;
        if (dbKey in movieUpdate) updatedFields.push(f);
      }
    }

    // ── Junction table syncs (shared functions — same as import-movies) ─────
    // @contract: each sync function is additive and idempotent. Errors propagate
    // (no silent swallowing) so the frontend knows if a fill actually failed.

    if (fieldSet.has('images')) {
      await syncAllImages(movieId, tmdbId, apiKey, supabase, {
        posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path,
      });
      updatedFields.push('images');
    }

    if (fieldSet.has('videos')) {
      await syncVideos(movieId, detail.videos.results, supabase);
      updatedFields.push('videos');
    }

    if (fieldSet.has('watch_providers')) {
      await syncWatchProvidersMultiCountry(movieId, tmdbId, apiKey, supabase);
      updatedFields.push('watch_providers');
    }

    if (fieldSet.has('keywords')) {
      await syncKeywords(movieId, detail, supabase);
      updatedFields.push('keywords');
    }

    if (fieldSet.has('production_companies')) {
      /* v8 ignore start */
      await syncProductionCompanies(movieId, detail.production_companies ?? [], supabase);
      /* v8 ignore stop */
      updatedFields.push('production_companies');
    }

    // @sideeffect: cast sync — additive by default, full-replace when forceResyncCast
    if (fieldSet.has('cast') || forceResyncCast) {
      if (forceResyncCast) {
        // @sideeffect: delete existing cast before re-sync
        await supabase.from('movie_cast').delete().eq('movie_id', movieId);
      }
      await syncCastCrewAdditive(movieId, detail, supabase);
      /* v8 ignore start */
      if (!updatedFields.includes('cast')) updatedFields.push('cast');
      /* v8 ignore stop */
    }

    return NextResponse.json({ movieId, updatedFields });
  } catch (err) {
    // @edge: surface TMDB rate-limit errors as 429 to the frontend
    if (err instanceof Error && err.message.includes('→ 429')) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err; // let wrapper handle all other errors
  }
});
