import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockGetUser = vi.fn();
const mockGetMovieDetails = vi.fn();
const mockGetPersonDetails = vi.fn();
const mockGetMovieImages = vi.fn();
const mockGetWatchProviders = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      // @contract: movie_images, movie_videos, movie_keywords, movie_production_houses, movie_platforms
      // are queried for DB-side counts — chain must be thenable (returns { data: [] })
      const isCountTable = [
        'movie_images',
        'movie_videos',
        'movie_keywords',
        'movie_production_houses',
        'movie_platforms',
      ].includes(table);

      const makeChain = (): Record<string, unknown> => {
        const chain: Record<string, unknown> = {
          eq: () => makeChain(),
          maybeSingle: mockMaybeSingle,
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        };
        if (isCountTable) {
          chain.then = (resolve: (v: { data: never[]; error: null }) => void, _reject?: unknown) =>
            Promise.resolve({ data: [], error: null }).then(resolve);
        }
        return chain;
      };

      return { select: () => makeChain() };
    },
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: (...args: unknown[]) => mockGetMovieDetails(...args),
  getPersonDetails: (...args: unknown[]) => mockGetPersonDetails(...args),
  getMovieImages: (...args: unknown[]) => mockGetMovieImages(...args),
  getWatchProviders: (...args: unknown[]) => mockGetWatchProviders(...args),
  TMDB_IMAGE: {
    poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
    backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
    profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
  },
}));

vi.mock('@/lib/tmdbTypes', () => ({
  extractIndiaCertification: () => null,
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/lookup/route';

describe('POST /api/sync/lookup', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockGetMovieDetails.mockReset();
    mockGetPersonDetails.mockReset();
    mockGetMovieImages.mockReset();
    mockGetWatchProviders.mockReset();
    mockMaybeSingle.mockReset();

    mockGetMovieImages.mockResolvedValue({ posters: [], backdrops: [], logos: [] });
    mockGetWatchProviders.mockResolvedValue([]);

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key');
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }, ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tmdbId is missing', async () => {
    const res = await POST(makeRequest({ type: 'movie' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when type is missing', async () => {
    const res = await POST(makeRequest({ tmdbId: 100 }));
    expect(res.status).toBe(400);
  });

  it('looks up a movie by tmdb id', async () => {
    mockGetMovieDetails.mockResolvedValue({
      id: 100,
      title: 'Test Movie',
      overview: 'A test movie',
      release_date: '2025-01-01',
      runtime: 120,
      genres: [{ name: 'Drama' }],
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      credits: {
        cast: [{ name: 'Actor' }],
        crew: [{ job: 'Director', name: 'Director Name' }],
      },
      videos: {
        results: [{ key: 'abc123', site: 'YouTube', type: 'Trailer' }],
      },
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('movie');
    expect(data.existsInDb).toBe(false);
    expect(data.data.title).toBe('Test Movie');
    expect(data.data.director).toBe('Director Name');
  });

  it('looks up a person by tmdb id', async () => {
    mockGetPersonDetails.mockResolvedValue({
      id: 500,
      name: 'Test Actor',
      biography: 'A biography',
      birthday: '1990-01-01',
      place_of_birth: 'Hyderabad',
      profile_path: '/profile.jpg',
      gender: 1,
    });
    mockMaybeSingle.mockResolvedValue({ data: { id: 'actor-1' }, error: null });

    const res = await POST(makeRequest({ tmdbId: 500, type: 'person' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('person');
    expect(data.existsInDb).toBe(true);
    expect(data.existingId).toBe('actor-1');
    expect(data.data.name).toBe('Test Actor');
  });

  it('handles movie with no director in crew', async () => {
    mockGetMovieDetails.mockResolvedValue({
      id: 101,
      title: 'No Director Movie',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      credits: { cast: [], crew: [{ job: 'Producer', name: 'Producer Name' }] },
      videos: { results: [] },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: 'Released',
      vote_average: 6.0,
      vote_count: 100,
      budget: 0,
      revenue: 0,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 101, type: 'movie' }));
    const data = await res.json();
    expect(data.data.director).toBeNull();
  });

  it('handles movie with no poster or backdrop paths', async () => {
    mockGetMovieDetails.mockResolvedValue({
      id: 102,
      title: 'No Images Movie',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: null,
      vote_average: null,
      vote_count: null,
      budget: null,
      revenue: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 102, type: 'movie' }));
    const data = await res.json();
    expect(data.data.posterUrl).toBeNull();
    expect(data.data.backdropUrl).toBeNull();
  });

  it('includes Telugu title from translations', async () => {
    mockGetMovieDetails.mockResolvedValue({
      id: 103,
      title: 'Telugu Movie',
      overview: '',
      release_date: '2025-01-01',
      runtime: 120,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: {
        translations: [
          { iso_639_1: 'te', data: { title: 'తెలుగు మూవీ', overview: 'తెలుగు వివరణ' } },
        ],
      },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: '',
      vote_average: 7.0,
      vote_count: 500,
      budget: 1000000,
      revenue: 5000000,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 103, type: 'movie' }));
    const data = await res.json();
    expect(data.data.titleTe).toBe('తెలుగు మూవీ');
    expect(data.data.synopsisTe).toBe('తెలుగు వివరణ');
  });

  it('handles errors in POST handler', async () => {
    mockGetMovieDetails.mockRejectedValue(new Error('TMDB unreachable'));
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 999, type: 'movie' }));
    expect(res.status).toBe(500);
  });

  it('returns 200 with person data when person has no profile photo', async () => {
    mockGetPersonDetails.mockResolvedValue({
      id: 501,
      name: 'No Photo Actor',
      biography: '',
      birthday: null,
      place_of_birth: null,
      profile_path: null,
      gender: 0,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 501, type: 'person' }));
    const data = await res.json();
    expect(data.data.photoUrl).toBeNull();
  });

  it('returns 503 when TMDB_API_KEY is not configured', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }));
    expect(res.status).toBe(503);
  });

  it('handles person lookup error', async () => {
    mockGetPersonDetails.mockRejectedValue(new Error('TMDB unreachable'));
    const res = await POST(makeRequest({ tmdbId: 999, type: 'person' }));
    expect(res.status).toBe(500);
  });

  it('skips re-fetch when originalLanguage is provided as non-English', async () => {
    const movieDetail = {
      id: 110,
      title: 'Telugu Movie',
      overview: 'Overview',
      release_date: '2025-01-01',
      runtime: 120,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      original_language: 'te',
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: 'Released',
      vote_average: 7.0,
      vote_count: 100,
      budget: 0,
      revenue: 0,
    };
    mockGetMovieDetails.mockResolvedValue(movieDetail);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 110, type: 'movie', originalLanguage: 'te' }));
    expect(res.status).toBe(200);
    // Should call getMovieDetails only once (with originalLanguage), not twice
    expect(mockGetMovieDetails).toHaveBeenCalledTimes(1);
    expect(mockGetMovieDetails).toHaveBeenCalledWith(110, 'test-tmdb-key', 'te');
  });

  it('skips re-fetch when originalLanguage is "en"', async () => {
    const movieDetail = {
      id: 111,
      title: 'English Movie',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      original_language: 'en',
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: 'Released',
      vote_average: 5.0,
      vote_count: 10,
      budget: 0,
      revenue: 0,
    };
    mockGetMovieDetails.mockResolvedValue(movieDetail);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 111, type: 'movie', originalLanguage: 'en' }));
    expect(res.status).toBe(200);
    // Should call once with no language param (English path)
    expect(mockGetMovieDetails).toHaveBeenCalledTimes(1);
    expect(mockGetMovieDetails).toHaveBeenCalledWith(111, 'test-tmdb-key');
  });

  it('auto-refetches when original_language is non-English and originalLanguage not provided', async () => {
    const movieDetail = {
      id: 112,
      title: 'Korean Movie',
      overview: 'A movie',
      release_date: '2025-01-01',
      runtime: 110,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      original_language: 'ko',
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: 'Released',
      vote_average: 7.0,
      vote_count: 100,
      budget: 0,
      revenue: 0,
    };
    mockGetMovieDetails.mockResolvedValue(movieDetail);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    // No originalLanguage provided, and original_language is 'ko' (non-English)
    const res = await POST(makeRequest({ tmdbId: 112, type: 'movie' }));
    expect(res.status).toBe(200);
    // Should call getMovieDetails twice: first without lang, then with 'ko'
    expect(mockGetMovieDetails).toHaveBeenCalledTimes(2);
    expect(mockGetMovieDetails).toHaveBeenNthCalledWith(1, 112, 'test-tmdb-key');
    expect(mockGetMovieDetails).toHaveBeenNthCalledWith(2, 112, 'test-tmdb-key', 'ko');
  });

  it('does not re-fetch when original_language is English and no originalLanguage provided', async () => {
    const movieDetail = {
      id: 113,
      title: 'English Only',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      original_language: 'en',
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: 'Released',
      vote_average: 5.0,
      vote_count: 10,
      budget: 0,
      revenue: 0,
    };
    mockGetMovieDetails.mockResolvedValue(movieDetail);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 113, type: 'movie' }));
    expect(res.status).toBe(200);
    // original_language is 'en' — should NOT re-fetch
    expect(mockGetMovieDetails).toHaveBeenCalledTimes(1);
  });

  it('handles missing translations object gracefully', async () => {
    const movieDetail = {
      id: 114,
      title: 'No Translations',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      original_language: 'en',
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      // translations undefined
      release_dates: { results: [] },
      external_ids: {},
      keywords: { keywords: [] },
      production_companies: [],
      spoken_languages: [],
      tagline: '',
      status: 'Released',
      vote_average: null,
      vote_count: null,
      budget: null,
      revenue: null,
    };
    mockGetMovieDetails.mockResolvedValue(movieDetail);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 114, type: 'movie' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.titleTe).toBeNull();
    expect(data.data.synopsisTe).toBeNull();
  });

  it('returns movie image and provider counts', async () => {
    const movieDetail = {
      id: 104,
      title: 'Count Movie',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      original_language: 'te',
      credits: { cast: [{}, {}, {}], crew: [{}, {}] },
      videos: {
        results: [
          { key: 'a', site: 'YouTube', type: 'Clip' },
          { key: 'b', site: 'YouTube', type: 'Trailer' },
        ],
      },
      translations: { translations: [] },
      release_dates: { results: [] },
      external_ids: { imdb_id: 'tt1234567' },
      keywords: { keywords: [{}, {}, {}] },
      production_companies: [{}, {}],
      spoken_languages: [{ iso_639_1: 'en' }, { iso_639_1: 'te' }],
      tagline: 'Cool tagline',
      status: 'Released',
      vote_average: 8.5,
      vote_count: 1000,
      budget: 50000000,
      revenue: 200000000,
    };
    // Route calls getMovieDetails twice (original_language='te' !== 'en' triggers re-fetch)
    mockGetMovieDetails.mockResolvedValue(movieDetail);
    mockGetMovieImages.mockResolvedValue({ posters: [{}, {}], backdrops: [{}], logos: [] });
    mockGetWatchProviders.mockResolvedValue([{ provider_name: 'Netflix' }]);
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing-1' }, error: null });

    const res = await POST(makeRequest({ tmdbId: 104, type: 'movie' }));
    const data = await res.json();
    expect(data.existsInDb).toBe(true);
    expect(data.existingId).toBe('existing-1');
    expect(data.data.castCount).toBe(3);
    expect(data.data.crewCount).toBe(2);
    expect(data.data.posterCount).toBe(2);
    expect(data.data.backdropCount).toBe(1);
    expect(data.data.videoCount).toBe(2);
    expect(data.data.providerNames).toEqual(['Netflix']);
    expect(data.data.keywordCount).toBe(3);
    expect(data.data.imdbId).toBe('tt1234567');
    expect(data.data.tagline).toBe('Cool tagline');
    expect(data.data.productionCompanyCount).toBe(2);
    expect(data.data.spokenLanguages).toEqual(['en', 'te']);
    expect(data.data.originalLanguage).toBe('te');
  });
});
