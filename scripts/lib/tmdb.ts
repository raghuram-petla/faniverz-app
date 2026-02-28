/**
 * TMDB API client for Telugu movie discovery and enrichment.
 * All functions are pure async — no side effects, no DB/R2 writes.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';

export const TMDB_IMAGE = {
  poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
  backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
  profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
} as const;

// ── Response types ────────────────────────────────────────────────────────────

export interface TmdbDiscoverMovie {
  id: number;
  title: string;
  release_date: string; // "YYYY-MM-DD"
  poster_path: string | null;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  genres: TmdbGenre[];
  poster_path: string | null;
  backdrop_path: string | null;
  credits: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
  videos: {
    results: TmdbVideo[];
  };
}

export interface TmdbPerson {
  id: number;
  name: string;
  birthday: string | null; // "YYYY-MM-DD"
  profile_path: string | null;
}

// ── Crew role mapping ─────────────────────────────────────────────────────────

/** Maps TMDB crew `job` string to (role_name, role_order) for our schema. */
const CREW_JOB_MAP: Record<string, { roleName: string; roleOrder: number }> = {
  Director: { roleName: 'Director', roleOrder: 1 },
  Producer: { roleName: 'Producer', roleOrder: 2 },
  'Executive Producer': { roleName: 'Producer', roleOrder: 2 },
  'Original Music Composer': { roleName: 'Music Director', roleOrder: 3 },
  'Director of Photography': { roleName: 'Director of Photography', roleOrder: 4 },
  Cinematography: { roleName: 'Director of Photography', roleOrder: 4 },
  Editor: { roleName: 'Editor', roleOrder: 5 },
};

export interface EnrichedCrewMember extends TmdbCrewMember {
  roleName: string;
  roleOrder: number;
}

/** Returns deduplicated crew for Director, Producer, Music, DOP, Editor. */
export function extractKeyCrewMembers(crew: TmdbCrewMember[]): EnrichedCrewMember[] {
  const seen = new Set<string>(); // `${id}-${roleOrder}` dedup
  const result: EnrichedCrewMember[] = [];

  for (const member of crew) {
    const mapping = CREW_JOB_MAP[member.job];
    if (!mapping) continue;
    const key = `${member.id}-${mapping.roleOrder}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...member, ...mapping });
  }
  return result;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function tmdbGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`TMDB ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch all Telugu-language films for a given year from TMDB Discover.
 * Paginates automatically. Returns lightweight objects (no credits yet).
 */
export async function discoverTeluguMovies(
  year: number,
  apiKey: string,
): Promise<TmdbDiscoverMovie[]> {
  const movies: TmdbDiscoverMovie[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await tmdbGet<{
      results: TmdbDiscoverMovie[];
      total_pages: number;
    }>('/discover/movie', {
      api_key: apiKey,
      with_original_language: 'te',
      primary_release_year: String(year),
      sort_by: 'release_date.asc',
      page: String(page),
    });

    movies.push(...data.results);
    totalPages = data.total_pages;
    page++;

    // Polite delay between pages
    if (page <= totalPages) await sleep(200);
  } while (page <= totalPages);

  return movies;
}

/**
 * Fetch full movie details including credits (cast + crew) and videos.
 */
export async function getMovieDetails(tmdbId: number, apiKey: string): Promise<TmdbMovieDetail> {
  return tmdbGet<TmdbMovieDetail>(`/movie/${tmdbId}`, {
    api_key: apiKey,
    append_to_response: 'credits,videos',
  });
}

/**
 * Fetch person details (used for birth_date backfill).
 */
export async function getPersonDetails(tmdbPersonId: number, apiKey: string): Promise<TmdbPerson> {
  return tmdbGet<TmdbPerson>(`/person/${tmdbPersonId}`, { api_key: apiKey });
}

/**
 * Find the first YouTube trailer URL from TMDB video results.
 * Returns null if none found.
 */
export function extractTrailerUrl(videos: TmdbVideo[]): string | null {
  const trailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
