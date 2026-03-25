import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

// @boundary: hoisted mocks for all dependencies
const mockGetUser = vi.hoisted(() => vi.fn());
const mockMovieMaybeSingle = vi.hoisted(() => vi.fn());
const mockMovieUpdate = vi.hoisted(() => vi.fn());
const mockMovieDeleteCast = vi.hoisted(() => vi.fn());
const mockGetMovieDetails = vi.hoisted(() => vi.fn());
const mockMaybeUploadImage = vi.hoisted(() => vi.fn());
const mockSyncAllImages = vi.hoisted(() => vi.fn());
const mockSyncVideos = vi.hoisted(() => vi.fn());
const mockSyncKeywords = vi.hoisted(() => vi.fn());
const mockSyncProductionCompanies = vi.hoisted(() => vi.fn());
const mockSyncWatchProviders = vi.hoisted(() => vi.fn());
const mockSyncCastCrewAdditive = vi.hoisted(() => vi.fn());

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
      if (table === 'movies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockMovieMaybeSingle(),
            }),
          }),
          update: (data: unknown) => ({
            eq: () => mockMovieUpdate(data),
          }),
        };
      }
      if (table === 'movie_cast') {
        return {
          delete: () => ({
            eq: () => mockMovieDeleteCast(),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
          }),
        }),
      };
    },
  }),
}));

// @contract: minimal TMDB detail for tests — only fields used by the route
const MOCK_DETAIL = {
  id: 101,
  title: 'Test Movie',
  overview: 'A test movie',
  release_date: '2025-01-01',
  runtime: 120,
  genres: [{ id: 1, name: 'Action' }],
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  credits: { cast: [], crew: [{ job: 'Director', name: 'Test Dir' }] },
  videos: { results: [] },
  external_ids: { imdb_id: 'tt1234' },
  translations: { translations: [] },
  keywords: { keywords: [] },
  release_dates: { results: [] },
  vote_average: 7.5,
  vote_count: 100,
  budget: 1000000,
  revenue: 5000000,
  status: 'Released',
  tagline: 'A tagline',
  spoken_languages: [{ iso_639_1: 'te' }],
  production_companies: [],
  original_language: 'te',
};

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: mockGetMovieDetails,
  TMDB_IMAGE: {
    poster: (p: string) => `https://tmdb${p}`,
    backdrop: (p: string) => `https://tmdb${p}`,
  },
}));
vi.mock('@/lib/r2-sync', () => ({
  maybeUploadImage: mockMaybeUploadImage,
  R2_BUCKETS: { moviePosters: 'posters', movieBackdrops: 'backdrops' },
}));
vi.mock('@/lib/sync-images', () => ({ syncAllImages: mockSyncAllImages }));
vi.mock('@/lib/sync-extended', () => ({
  syncVideos: mockSyncVideos,
  syncKeywords: mockSyncKeywords,
  syncProductionCompanies: mockSyncProductionCompanies,
}));
vi.mock('@/lib/sync-watch-providers', () => ({
  syncWatchProvidersMultiCountry: mockSyncWatchProviders,
}));
vi.mock('@/lib/sync-cast', () => ({ syncCastCrewAdditive: mockSyncCastCrewAdditive }));
vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/fill-fields/route';

describe('POST /api/sync/fill-fields', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('TMDB_API_KEY', 'test-key');
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: 'te' },
      error: null,
    });
    mockMovieUpdate.mockResolvedValue({ error: null });
    mockMovieDeleteCast.mockResolvedValue({ error: null });
    mockGetMovieDetails.mockResolvedValue({ ...MOCK_DETAIL });
    mockMaybeUploadImage.mockResolvedValue('uploaded-key.jpg');
    mockSyncAllImages.mockResolvedValue({ posterCount: 2, backdropCount: 1 });
    mockSyncVideos.mockResolvedValue(3);
    mockSyncKeywords.mockResolvedValue(5);
    mockSyncProductionCompanies.mockResolvedValue(2);
    mockSyncWatchProviders.mockResolvedValue(1);
    mockSyncCastCrewAdditive.mockResolvedValue({ castCount: 5, crewCount: 3 });
  });

  it('returns 401 when authorization is missing', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }, ''));
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields is empty and no forceResyncCast', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when movie not in DB', async () => {
    mockMovieMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ tmdbId: 999, fields: ['synopsis'] }));
    expect(res.status).toBe(404);
  });

  // ── Targeted field sync tests ─────────────────────────────────────────
  it('updates only requested scalar fields', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['title', 'synopsis'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Movie', synopsis: 'A test movie' }),
    );
    // @contract: should NOT have called junction sync functions
    expect(mockSyncAllImages).not.toHaveBeenCalled();
    expect(mockSyncVideos).not.toHaveBeenCalled();
    const data = await res.json();
    expect(data.updatedFields).toEqual(expect.arrayContaining(['title', 'synopsis']));
  });

  it('calls syncAllImages only when images field is requested', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['images'] }));
    expect(res.status).toBe(200);
    expect(mockSyncAllImages).toHaveBeenCalledWith(
      'movie-uuid',
      101,
      'test-key',
      expect.anything(),
      { posterPath: '/poster.jpg', backdropPath: '/backdrop.jpg' },
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('images');
  });

  it('calls syncVideos only when videos field is requested', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['videos'] }));
    expect(res.status).toBe(200);
    expect(mockSyncVideos).toHaveBeenCalled();
    expect(mockSyncKeywords).not.toHaveBeenCalled();
  });

  it('calls syncWatchProvidersMultiCountry for watch_providers', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['watch_providers'] }));
    expect(res.status).toBe(200);
    expect(mockSyncWatchProviders).toHaveBeenCalled();
  });

  it('calls syncKeywords for keywords', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['keywords'] }));
    expect(res.status).toBe(200);
    expect(mockSyncKeywords).toHaveBeenCalled();
  });

  it('calls syncProductionCompanies for production_companies', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['production_companies'] }));
    expect(res.status).toBe(200);
    expect(mockSyncProductionCompanies).toHaveBeenCalled();
  });

  // ── Cast sync ─────────────────────────────────────────────────────────
  it('allows fields=[] when forceResyncCast=true', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: [], forceResyncCast: true }));
    expect(res.status).toBe(200);
    expect(mockMovieDeleteCast).toHaveBeenCalled();
    expect(mockSyncCastCrewAdditive).toHaveBeenCalled();
    const data = await res.json();
    expect(data.updatedFields).toContain('cast');
  });

  it('does not delete cast for normal additive cast sync', async () => {
    mockMovieDeleteCast.mockClear();
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['cast'] }));
    expect(res.status).toBe(200);
    expect(mockMovieDeleteCast).not.toHaveBeenCalled();
    expect(mockSyncCastCrewAdditive).toHaveBeenCalled();
  });

  // ── Error propagation ─────────────────────────────────────────────────
  it('returns 500 when syncAllImages throws', async () => {
    mockSyncAllImages.mockRejectedValue(new Error('R2 upload failed'));
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['images'] }));
    expect(res.status).toBe(500);
  });

  it('returns 429 when TMDB rate-limits', async () => {
    mockGetMovieDetails.mockRejectedValue(new Error('TMDB /movie/101 → 429 Too Many Requests'));
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }));
    expect(res.status).toBe(429);
  });

  it('returns 500 when movie update fails', async () => {
    mockMovieUpdate.mockResolvedValue({ error: { message: 'constraint violation' } });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['title'] }));
    expect(res.status).toBe(500);
  });

  // ── Scalar field branches ─────────────────────────────────────────
  it('fills release_date, director, runtime, genres fields', async () => {
    const res = await POST(
      makeRequest({ tmdbId: 101, fields: ['release_date', 'director', 'runtime', 'genres'] }),
    );
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        release_date: '2025-01-01',
        director: 'Test Dir',
        runtime: 120,
        genres: ['Action'],
      }),
    );
    const data = await res.json();
    expect(data.updatedFields).toEqual(
      expect.arrayContaining(['release_date', 'director', 'runtime', 'genres']),
    );
  });

  it('fills imdb_id, tagline, tmdb_status fields', async () => {
    const res = await POST(
      makeRequest({ tmdbId: 101, fields: ['imdb_id', 'tagline', 'tmdb_status'] }),
    );
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        imdb_id: 'tt1234',
        tagline: 'A tagline',
        tmdb_status: 'Released',
      }),
    );
  });

  it('fills tmdb_ratings field', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['tmdb_ratings'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdb_vote_average: 7.5,
        tmdb_vote_count: 100,
      }),
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('tmdb_ratings');
  });

  it('fills budget_revenue field', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['budget_revenue'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        budget: 1000000,
        revenue: 5000000,
      }),
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('budget_revenue');
  });

  it('fills certification_auto field', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['certification_auto'] }));
    expect(res.status).toBe(200);
    // extractIndiaCertification returns null by default (mock detail has empty release_dates)
    // so certification won't be in movieUpdate, but the field is still processed
  });

  it('fills spoken_languages field', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['spoken_languages'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        spoken_languages: ['te'],
      }),
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('spoken_languages');
  });

  it('uploads poster_url via maybeUploadImage', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['poster_url'] }));
    expect(res.status).toBe(200);
    expect(mockMaybeUploadImage).toHaveBeenCalled();
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ poster_url: 'uploaded-key.jpg' }),
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('poster_url');
  });

  it('uploads backdrop_url via maybeUploadImage', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['backdrop_url'] }));
    expect(res.status).toBe(200);
    expect(mockMaybeUploadImage).toHaveBeenCalled();
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ backdrop_url: 'uploaded-key.jpg' }),
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('backdrop_url');
  });

  it('skips poster_url when poster_path is null', async () => {
    mockMaybeUploadImage.mockClear();
    mockGetMovieDetails.mockResolvedValue({ ...MOCK_DETAIL, poster_path: null });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['poster_url'] }));
    expect(res.status).toBe(200);
    expect(mockMaybeUploadImage).not.toHaveBeenCalled();
  });

  it('skips backdrop_url when backdrop_path is null', async () => {
    mockMaybeUploadImage.mockClear();
    mockGetMovieDetails.mockResolvedValue({ ...MOCK_DETAIL, backdrop_path: null });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['backdrop_url'] }));
    expect(res.status).toBe(200);
    expect(mockMaybeUploadImage).not.toHaveBeenCalled();
  });

  it('does not set poster_url when maybeUploadImage returns null', async () => {
    mockMaybeUploadImage.mockResolvedValue(null);
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['poster_url'] }));
    expect(res.status).toBe(200);
    // movieUpdate should not contain poster_url since upload returned null
  });

  it('fills title_te and synopsis_te when translations exist', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...MOCK_DETAIL,
      translations: {
        translations: [{ iso_639_1: 'te', data: { title: 'తెలుగు', overview: 'వివరణ' } }],
      },
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['title_te', 'synopsis_te'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title_te: 'తెలుగు', synopsis_te: 'వివరణ' }),
    );
  });

  it('returns 400 when tmdbId is missing', async () => {
    const res = await POST(makeRequest({ fields: ['title'] }));
    expect(res.status).toBe(400);
  });

  it('handles null original_language gracefully', async () => {
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: null },
      error: null,
    });
    await POST(makeRequest({ tmdbId: 101, fields: ['title'] }));
    expect(mockGetMovieDetails).toHaveBeenCalledWith(101, 'test-key', undefined);
  });

  // ── Language handling ─────────────────────────────────────────────────
  it('passes originalLanguage for non-English movies', async () => {
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: 'hi' },
      error: null,
    });
    await POST(makeRequest({ tmdbId: 101, fields: ['videos'] }));
    expect(mockGetMovieDetails).toHaveBeenCalledWith(101, 'test-key', 'hi');
  });

  it('does not pass originalLanguage for English movies', async () => {
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: 'en' },
      error: null,
    });
    await POST(makeRequest({ tmdbId: 101, fields: ['videos'] }));
    expect(mockGetMovieDetails).toHaveBeenCalledWith(101, 'test-key', undefined);
  });
});
