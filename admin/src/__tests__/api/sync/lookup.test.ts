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
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: (...args: unknown[]) => mockGetMovieDetails(...args),
  getPersonDetails: (...args: unknown[]) => mockGetPersonDetails(...args),
  getMovieImages: (...args: unknown[]) => mockGetMovieImages(...args),
  getWatchProviders: (...args: unknown[]) => mockGetWatchProviders(...args),
  extractTrailerUrl: (videos: Array<{ key: string; site: string; type: string }>) => {
    const t = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
    return t ? `https://www.youtube.com/watch?v=${t.key}` : null;
  },
  TMDB_IMAGE: {
    poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
    backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
    profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
  },
}));

vi.mock('@/lib/tmdbTypes', () => ({
  extractTrailerUrl: (videos: Array<{ key: string; site: string; type: string }>) => {
    const t = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
    return t ? `https://www.youtube.com/watch?v=${t.key}` : null;
  },
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

  it('returns movie image and provider counts', async () => {
    mockGetMovieDetails.mockResolvedValue({
      id: 104,
      title: 'Count Movie',
      overview: '',
      release_date: '2025-01-01',
      runtime: 90,
      genres: [],
      poster_path: null,
      backdrop_path: null,
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
    });
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
  });
});
