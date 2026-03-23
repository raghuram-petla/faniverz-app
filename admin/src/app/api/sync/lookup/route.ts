import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  getMovieDetails,
  getPersonDetails,
  getMovieImages,
  getWatchProviders,
  TMDB_IMAGE,
} from '@/lib/tmdb';
import { extractIndiaCertification } from '@/lib/tmdbTypes';
import { ensureTmdbApiKey, errorResponse, verifyAdmin } from '@/lib/sync-helpers';

/**
 * POST /api/sync/lookup
 * Preview a TMDB movie or person before importing.
 * Read-only — no DB writes.
 */
// @contract: accepts { tmdbId, type: 'movie'|'person' }; returns preview data + existsInDb flag
// @sync: read-only — fetches from TMDB and checks local DB but never writes
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @coupling: TMDB API key sourced from env; all TMDB calls share this pattern
    const tmdb = ensureTmdbApiKey();
    if (!tmdb.ok) return tmdb.response;

    const body = await request.json();
    const { tmdbId, type } = body as { tmdbId: number; type: 'movie' | 'person' };

    if (!tmdbId || !type) {
      return NextResponse.json({ error: 'tmdbId and type are required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (type === 'movie') {
      const detail = await getMovieDetails(tmdbId, tmdb.apiKey);

      // Check if already in our DB
      const { data: existing } = await supabase
        .from('movies')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .maybeSingle();

      // @nullable: director may be null if TMDB has no crew data or no Director job entry
      const director = detail.credits.crew.find((c) => c.job === 'Director')?.name ?? null;

      // @boundary: fetch images + providers in parallel (2 extra API calls)
      const [images, providers] = await Promise.all([
        getMovieImages(tmdbId, tmdb.apiKey),
        getWatchProviders(tmdbId, tmdb.apiKey),
      ]);

      // @contract: extract Telugu translation
      const teTrans = detail.translations?.translations.find((t) => t.iso_639_1 === 'te');

      return NextResponse.json({
        type: 'movie',
        existsInDb: !!existing,
        existingId: existing?.id ?? null,
        data: {
          tmdbId: detail.id,
          title: detail.title,
          overview: detail.overview,
          releaseDate: detail.release_date,
          runtime: detail.runtime,
          genres: detail.genres.map((g) => g.name),
          posterUrl: detail.poster_path ? TMDB_IMAGE.poster(detail.poster_path) : null,
          backdropUrl: detail.backdrop_path ? TMDB_IMAGE.backdrop(detail.backdrop_path) : null,
          director,
          trailerUrl: null, // @deprecated trailer_url removed — videos stored in movie_videos
          castCount: detail.credits.cast.length,
          crewCount: detail.credits.crew.length,
          // @contract: extended counts for diff panel
          posterCount: images.posters.length,
          backdropCount: images.backdrops.length,
          videoCount: detail.videos.results.filter((v) => v.site === 'YouTube').length,
          providerNames: providers.map((p) => p.provider_name),
          keywordCount: detail.keywords?.keywords?.length ?? 0,
          imdbId: detail.external_ids?.imdb_id ?? null,
          titleTe: teTrans?.data.title || null,
          synopsisTe: teTrans?.data.overview || null,
          // @contract: new TMDB metadata for diff panel
          tagline: detail.tagline || null,
          tmdbStatus: detail.status || null,
          tmdbVoteAverage: detail.vote_average ?? null,
          tmdbVoteCount: detail.vote_count ?? null,
          budget: detail.budget || null,
          revenue: detail.revenue || null,
          certification: extractIndiaCertification(detail.release_dates),
          spokenLanguages: detail.spoken_languages?.map((l) => l.iso_639_1) ?? [],
          productionCompanyCount: detail.production_companies?.length ?? 0,
          originalLanguage: detail.original_language,
        },
      });
    } else {
      const person = await getPersonDetails(tmdbId, tmdb.apiKey);

      // Check if already in our DB
      const { data: existing } = await supabase
        .from('actors')
        .select('id')
        .eq('tmdb_person_id', tmdbId)
        .maybeSingle();

      return NextResponse.json({
        type: 'person',
        existsInDb: !!existing,
        existingId: existing?.id ?? null,
        data: {
          tmdbPersonId: person.id,
          name: person.name,
          biography: person.biography,
          birthday: person.birthday,
          placeOfBirth: person.place_of_birth,
          photoUrl: person.profile_path ? TMDB_IMAGE.profile(person.profile_path) : null,
          gender: person.gender,
        },
      });
    }
  } catch (err) {
    return errorResponse('Lookup', err);
  }
}
