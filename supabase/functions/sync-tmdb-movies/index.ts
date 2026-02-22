import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  TmdbDiscoverResponse,
  TmdbMovieDetail,
  TMDB_GENRE_MAP,
  CREW_ROLES_TO_SYNC,
  CREW_ROLE_MAP,
} from '../_shared/tmdb-types.ts';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MAX_CAST_MEMBERS = 15;

interface SyncResult {
  moviesAdded: number;
  moviesUpdated: number;
  castSynced: number;
  errors: string[];
}

async function fetchFromTmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = Deno.env.get('TMDB_API_KEY');
  if (!apiKey) throw new Error('TMDB_API_KEY not set');

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText} for ${path}`);
  }
  return response.json() as Promise<T>;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(): { gte: string; lte: string } {
  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 90);
  const future = new Date(today);
  future.setDate(future.getDate() + 180);
  return { gte: formatDate(past), lte: formatDate(future) };
}

async function discoverTeluguMovies(): Promise<TmdbMovieDetail[]> {
  const { gte, lte } = getDateRange();
  const allMovies: TmdbMovieDetail[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 20) {
    const response = await fetchFromTmdb<TmdbDiscoverResponse>('/discover/movie', {
      with_original_language: 'te',
      region: 'IN',
      'primary_release_date.gte': gte,
      'primary_release_date.lte': lte,
      sort_by: 'primary_release_date.asc',
      page: String(page),
    });

    totalPages = response.total_pages;

    // Fetch details for each movie (credits + videos)
    for (const movie of response.results) {
      try {
        const detail = await fetchFromTmdb<TmdbMovieDetail>(`/movie/${movie.id}`, {
          append_to_response: 'credits,videos',
        });
        allMovies.push(detail);
      } catch (error) {
        console.error(`Failed to fetch details for movie ${movie.id}:`, error);
      }
    }

    page++;
  }

  return allMovies;
}

function extractTrailerKey(detail: TmdbMovieDetail): string | null {
  if (!detail.videos?.results?.length) return null;

  // Prefer official YouTube trailers
  const official = detail.videos.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  );
  if (official) return official.key;

  // Fall back to any YouTube trailer
  const anyTrailer = detail.videos.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer'
  );
  if (anyTrailer) return anyTrailer.key;

  // Fall back to any YouTube teaser
  const teaser = detail.videos.results.find((v) => v.site === 'YouTube' && v.type === 'Teaser');
  return teaser?.key ?? null;
}

function mapGenres(detail: TmdbMovieDetail): string[] {
  if (detail.genres?.length) {
    return detail.genres.map((g) => g.name);
  }
  // Fall back to genre_ids from discover results
  return detail.genre_ids?.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean) ?? [];
}

function determineStatus(releaseDate: string): string {
  if (!releaseDate) return 'upcoming';
  const release = new Date(releaseDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return release <= today ? 'released' : 'upcoming';
}

export async function syncMovies(): Promise<SyncResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const result: SyncResult = { moviesAdded: 0, moviesUpdated: 0, castSynced: 0, errors: [] };

  const movies = await discoverTeluguMovies();

  for (const detail of movies) {
    try {
      // Check if movie already exists to preserve curated fields
      const { data: existing } = await supabase
        .from('movies')
        .select('id, title_te, overview_te, is_featured, status, release_type')
        .eq('tmdb_id', detail.id)
        .maybeSingle();

      const movieData = {
        tmdb_id: detail.id,
        title: detail.title,
        original_title: detail.original_title,
        overview: detail.overview,
        poster_path: detail.poster_path,
        backdrop_path: detail.backdrop_path,
        release_date: detail.release_date || null,
        runtime: detail.runtime,
        genres: mapGenres(detail),
        vote_average: detail.vote_average,
        vote_count: detail.vote_count,
        popularity: detail.popularity,
        trailer_youtube_key: extractTrailerKey(detail),
        tmdb_last_synced_at: new Date().toISOString(),
        // Preserve curated fields if they exist
        ...(existing
          ? {
              title_te: existing.title_te,
              overview_te: existing.overview_te,
              is_featured: existing.is_featured,
              status:
                existing.status !== 'postponed' && existing.status !== 'cancelled'
                  ? determineStatus(detail.release_date)
                  : existing.status,
              release_type: existing.release_type,
            }
          : {
              status: determineStatus(detail.release_date),
            }),
      };

      const { data: upserted, error: upsertError } = await supabase
        .from('movies')
        .upsert(movieData, { onConflict: 'tmdb_id' })
        .select('id')
        .single();

      if (upsertError) {
        result.errors.push(`Movie ${detail.id}: ${upsertError.message}`);
        continue;
      }

      if (existing) {
        result.moviesUpdated++;
      } else {
        result.moviesAdded++;
      }

      // Sync cast
      if (upserted && detail.credits) {
        await syncCast(supabase, upserted.id, detail, result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Movie ${detail.id}: ${message}`);
    }
  }

  return result;
}

async function syncCast(
  supabase: ReturnType<typeof createClient>,
  movieId: number,
  detail: TmdbMovieDetail,
  result: SyncResult
): Promise<void> {
  const castEntries: {
    movie_id: number;
    tmdb_person_id: number;
    name: string;
    character: string | null;
    role: string;
    profile_path: string | null;
    display_order: number;
  }[] = [];

  // Top actors (up to MAX_CAST_MEMBERS)
  const actors = detail.credits.cast.slice(0, MAX_CAST_MEMBERS);
  for (const actor of actors) {
    castEntries.push({
      movie_id: movieId,
      tmdb_person_id: actor.id,
      name: actor.name,
      character: actor.character || null,
      role: 'actor',
      profile_path: actor.profile_path,
      display_order: actor.order,
    });
  }

  // Key crew members
  const crewSeen = new Set<string>();
  for (const crew of detail.credits.crew) {
    if (!CREW_ROLES_TO_SYNC.includes(crew.job)) continue;
    const key = `${crew.id}-${CREW_ROLE_MAP[crew.job]}`;
    if (crewSeen.has(key)) continue;
    crewSeen.add(key);

    castEntries.push({
      movie_id: movieId,
      tmdb_person_id: crew.id,
      name: crew.name,
      character: null,
      role: CREW_ROLE_MAP[crew.job],
      profile_path: crew.profile_path,
      display_order: 100 + castEntries.length,
    });
  }

  if (castEntries.length === 0) return;

  // Delete existing cast for this movie, then insert fresh
  await supabase.from('movie_cast').delete().eq('movie_id', movieId);

  // Preserve any existing Telugu names
  const tmdbPersonIds = castEntries.map((c) => c.tmdb_person_id);
  const { data: existingCast } = await supabase
    .from('movie_cast')
    .select('tmdb_person_id, name_te')
    .in('tmdb_person_id', tmdbPersonIds)
    .not('name_te', 'is', null);

  const teluguNameMap = new Map<number, string>();
  if (existingCast) {
    for (const c of existingCast) {
      if (c.name_te) teluguNameMap.set(c.tmdb_person_id, c.name_te);
    }
  }

  const castWithTelugu = castEntries.map((entry) => ({
    ...entry,
    name_te: teluguNameMap.get(entry.tmdb_person_id) ?? null,
  }));

  const { error: castError } = await supabase.from('movie_cast').insert(castWithTelugu);
  if (castError) {
    result.errors.push(`Cast for movie ${movieId}: ${castError.message}`);
  } else {
    result.castSynced += castEntries.length;
  }
}

// Deno serve handler
Deno.serve(async (req) => {
  try {
    // Only allow POST or invoke via CRON
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await syncMovies();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
