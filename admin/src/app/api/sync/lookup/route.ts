import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails, getPersonDetails, TMDB_IMAGE } from '@/lib/tmdb';
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
          // @nullable: poster_path and backdrop_path may be null for obscure TMDB entries
          posterUrl: detail.poster_path ? TMDB_IMAGE.poster(detail.poster_path) : null,
          backdropUrl: detail.backdrop_path ? TMDB_IMAGE.backdrop(detail.backdrop_path) : null,
          director,
          castCount: detail.credits.cast.length,
          crewCount: detail.credits.crew.length,
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
