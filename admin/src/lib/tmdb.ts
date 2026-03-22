/**
 * TMDB API client for the admin sync command center.
 * Server-side only (requires TMDB_API_KEY env var).
 *
 * @boundary: TMDB rate limit is 40 requests per 10 seconds per API key. The 200ms
 * sleep between paginated discover calls keeps sequential page fetches safe, but
 * concurrent calls to processMovieFromTmdb (sync-engine.ts) each make their own
 * getMovieDetails call — importing >30 movies simultaneously risks 429 responses.
 * 429s throw as generic errors with no retry logic.
 */

// Re-export all types and pure helpers from tmdbTypes so existing consumers
// can continue importing from '@/lib/tmdb' without changes.
export * from './tmdbTypes';

import type {
  TmdbDiscoverMovie,
  TmdbMovieDetailExtended,
  TmdbPerson,
  TmdbSearchPerson,
  TmdbImagesResponse,
  TmdbWatchProvider,
  TmdbWatchProvidersResponse,
} from './tmdbTypes';

const TMDB_BASE = 'https://api.themoviedb.org/3';

// @coupling: these TMDB image sizes are used by r2-sync.ts as source URLs for download-and-reupload.
// @assumes: TMDB image CDN does not require authentication — images are public via path.
export const TMDB_IMAGE = {
  poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
  posterOriginal: (path: string) => `https://image.tmdb.org/t/p/original${path}`,
  backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
  profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
} as const;

// ── HTTP helper ───────────────────────────────────────────────────────────────

// @boundary: no retry logic — transient 429 or 503 responses throw immediately.
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
 */
export async function discoverMoviesByLanguage(
  year: number,
  language: string,
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
      with_original_language: language,
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

/** Discover movies by language filtered by year and month. */
export async function discoverMoviesByLanguageAndMonth(
  year: number,
  month: number,
  language: string,
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
      with_original_language: language,
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

// @contract: returns credits, videos, external_ids, translations, keywords, and
// release_dates in a single request via append_to_response (counts as 1 API call).
export async function getMovieDetails(
  tmdbId: number,
  apiKey: string,
): Promise<TmdbMovieDetailExtended> {
  return tmdbGet<TmdbMovieDetailExtended>(`/movie/${tmdbId}`, {
    api_key: apiKey,
    append_to_response: 'credits,videos,external_ids,translations,keywords,release_dates',
  });
}

/** Fetch person details (biography, birth date, photo, external IDs).
 * @contract: appends external_ids in single request for social links (IMDb, Instagram, Twitter). */
export async function getPersonDetails(tmdbPersonId: number, apiKey: string): Promise<TmdbPerson> {
  return tmdbGet<TmdbPerson>(`/person/${tmdbPersonId}`, {
    api_key: apiKey,
    append_to_response: 'external_ids',
  });
}

/**
 * Fetch all posters, backdrops, and logos for a movie.
 * @boundary: separate API call (images can't be appended to movie details).
 */
export async function getMovieImages(tmdbId: number, apiKey: string): Promise<TmdbImagesResponse> {
  return tmdbGet<TmdbImagesResponse>(`/movie/${tmdbId}/images`, {
    api_key: apiKey,
    include_image_language: 'te,hi,en,null',
  });
}

/** Fetch all TMDB watch provider regions with English names. */
export async function getWatchRegions(apiKey: string): Promise<Record<string, string>> {
  const data = await tmdbGet<{ results: { iso_3166_1: string; english_name: string }[] }>(
    '/watch/providers/regions',
    { api_key: apiKey },
  );
  const map: Record<string, string> = {};
  for (const r of data.results) map[r.iso_3166_1] = r.english_name;
  return map;
}

/**
 * Fetch streaming/watch providers for a movie — India flatrate only.
 * @nullable: returns empty array if no IN data or no flatrate providers.
 */
export async function getWatchProviders(
  tmdbId: number,
  apiKey: string,
): Promise<TmdbWatchProvider[]> {
  const data = await getAllWatchProviders(tmdbId, apiKey);
  return data.results?.IN?.flatrate ?? [];
}

/** Fetch ALL watch providers for a movie across all countries and availability types. */
export async function getAllWatchProviders(
  tmdbId: number,
  apiKey: string,
): Promise<TmdbWatchProvidersResponse> {
  return tmdbGet<TmdbWatchProvidersResponse>(`/movie/${tmdbId}/watch/providers`, {
    api_key: apiKey,
  });
}

// ── Search API ────────────────────────────────────────────────────────────────

/** @boundary Search TMDB movies by title and language. Fetches up to 3 pages (~60 results). */
export async function searchMovies(
  query: string,
  apiKey: string,
  language?: string,
): Promise<TmdbDiscoverMovie[]> {
  const movies: TmdbDiscoverMovie[] = [];
  const maxPages = 3;
  let page = 1;
  let totalPages = 1;

  do {
    const params: Record<string, string> = { api_key: apiKey, query, page: String(page) };
    if (language) params.with_original_language = language;
    const data = await tmdbGet<{ results: TmdbDiscoverMovie[]; total_pages: number }>(
      '/search/movie',
      params,
    );
    movies.push(...data.results);
    totalPages = data.total_pages;
    page++;
    if (page <= Math.min(totalPages, maxPages)) await sleep(200);
  } while (page <= Math.min(totalPages, maxPages));

  return movies;
}

/** @boundary Search TMDB for persons by name. Fetches up to 3 pages (~60 results). */
export async function searchPersons(query: string, apiKey: string): Promise<TmdbSearchPerson[]> {
  const persons: TmdbSearchPerson[] = [];
  const maxPages = 3;
  let page = 1;
  let totalPages = 1;

  do {
    const data = await tmdbGet<{ results: TmdbSearchPerson[]; total_pages: number }>(
      '/search/person',
      { api_key: apiKey, query, page: String(page) },
    );
    persons.push(...data.results);
    totalPages = data.total_pages;
    page++;
    if (page <= Math.min(totalPages, maxPages)) await sleep(200);
  } while (page <= Math.min(totalPages, maxPages));

  return persons;
}
