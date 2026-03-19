/**
 * TMDB API client for the admin sync command center.
 * Adapted from scripts/lib/tmdb.ts — pure async, no side effects.
 * Server-side only (requires TMDB_API_KEY env var).
 *
 * @boundary: TMDB rate limit is 40 requests per 10 seconds per API key. The 200ms
 * sleep between paginated discover calls keeps sequential page fetches safe, but
 * concurrent calls to processMovieFromTmdb (sync-engine.ts) each make their own
 * getMovieDetails call — importing >30 movies simultaneously risks 429 responses.
 * 429s throw as generic errors with no retry logic.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';

// @coupling: these TMDB image sizes are used by r2-sync.ts as source URLs for download-and-reupload.
// If TMDB deprecates a size tier (e.g. w500), all poster downloads silently 404 and r2-sync falls
// back to storing the broken TMDB URL in the DB. The app then shows broken poster images.
// @assumes: TMDB image CDN does not require authentication — images are public via path.
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
  gender: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  gender: number;
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
  birthday: string | null;
  profile_path: string | null;
  biography: string | null;
  place_of_birth: string | null;
  gender: number;
}

export interface TmdbSearchPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
}

// ── Crew role mapping ─────────────────────────────────────────────────────────

// @coupling: these job titles must match TMDB's exact English strings — TMDB does not
// localize crew.job values even for non-English movies. Syncing a Telugu movie still
// returns "Director", "Producer", etc. in English.
// @edge: 'Executive Producer' maps to the same roleName/roleOrder as 'Producer' — if
// a person is listed as both Producer and Executive Producer on TMDB, the dedup key
// `${id}-${roleOrder}` in extractKeyCrewMembers prevents duplicate inserts, but the
// person only appears once with whichever title was encountered first in the array.
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
  const seen = new Set<string>();
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

// @boundary: no retry logic — transient 429 (rate limit) or 503 (TMDB maintenance)
// responses throw immediately. Callers (sync-engine.ts) propagate the error to the
// sync log as a failed sync, requiring manual re-trigger from the admin UI.
// @edge: TMDB returns 200 with empty results for valid but nonsensical queries
// (e.g. discover for year 3000) — the caller sees an empty array, not an error.
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch all Telugu-language films for a given year from TMDB Discover.
 * Paginates automatically.
 *
 * @edge: TMDB caps discover results at 500 pages (10,000 movies). Telugu cinema
 * produces ~200-300 films/year so this limit is never hit, but a broader language
 * filter could silently truncate results without any error.
 * @assumes: sleep(200) between pages yields ~5 req/sec, well within TMDB's 40/10s
 * limit for a single sequential caller. Concurrent calls to this function from
 * different admin users share the same API key and can collectively exceed the limit.
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

    if (page <= totalPages) await sleep(200);
  } while (page <= totalPages);

  return movies;
}

/**
 * Discover Telugu movies filtered by year and month.
 * Uses date range params instead of year-only.
 */
export async function discoverTeluguMoviesByMonth(
  year: number,
  month: number,
  apiKey: string,
): Promise<TmdbDiscoverMovie[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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
      'primary_release_date.gte': startDate,
      'primary_release_date.lte': endDate,
      sort_by: 'release_date.asc',
      page: String(page),
    });

    movies.push(...data.results);
    totalPages = data.total_pages;
    page++;

    if (page <= totalPages) await sleep(200);
  } while (page <= totalPages);

  return movies;
}

// @contract: returns credits and videos in a single request via append_to_response,
// which counts as 1 API call against the rate limit (not 3). If TMDB ever removes
// append_to_response support, this needs to become 3 separate calls with rate limiting.
export async function getMovieDetails(tmdbId: number, apiKey: string): Promise<TmdbMovieDetail> {
  return tmdbGet<TmdbMovieDetail>(`/movie/${tmdbId}`, {
    api_key: apiKey,
    append_to_response: 'credits,videos',
  });
}

/** Fetch person details (biography, birth date, photo). */
export async function getPersonDetails(tmdbPersonId: number, apiKey: string): Promise<TmdbPerson> {
  return tmdbGet<TmdbPerson>(`/person/${tmdbPersonId}`, { api_key: apiKey });
}

// @edge: returns the FIRST video with type='Trailer' and site='YouTube'. If TMDB
// has multiple trailers (e.g. teaser + official), only the first is stored. Teasers
// with type='Teaser' are ignored — a movie with only a teaser returns null here,
// even though a video exists on TMDB.
export function extractTrailerUrl(videos: TmdbVideo[]): string | null {
  const trailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

// ── Search API ────────────────────────────────────────────────────────────────

/** @boundary Search TMDB for Telugu movies by title. Returns first page (20 results). */
export async function searchMovies(query: string, apiKey: string): Promise<TmdbDiscoverMovie[]> {
  const data = await tmdbGet<{ results: TmdbDiscoverMovie[] }>('/search/movie', {
    api_key: apiKey,
    query,
    with_original_language: 'te',
  });
  return data.results;
}

/** @boundary Search TMDB for persons by name. Returns first page (20 results). */
export async function searchPersons(query: string, apiKey: string): Promise<TmdbSearchPerson[]> {
  const data = await tmdbGet<{ results: TmdbSearchPerson[] }>('/search/person', {
    api_key: apiKey,
    query,
  });
  return data.results;
}
