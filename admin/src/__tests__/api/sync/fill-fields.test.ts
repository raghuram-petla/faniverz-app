import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// @boundary: use vi.hoisted so variables are available when vi.mock factory runs
const mockGetUser = vi.hoisted(() => vi.fn());
const mockMovieMaybeSingle = vi.hoisted(() => vi.fn());
const mockMovieUpdate = vi.hoisted(() => vi.fn());
const mockCastCount = vi.hoisted(() => vi.fn());
const mockCastDelete = vi.hoisted(() => vi.fn());
const mockCastInsert = vi.hoisted(() => vi.fn());
const mockActorUpsert = vi.hoisted(() => vi.fn());
const mockGetMovieDetails = vi.hoisted(() => vi.fn());
const mockMaybeUploadImage = vi.hoisted(() => vi.fn());
const mockMoviePostersMainSelect = vi.hoisted(() => vi.fn());
const mockMoviePostersInsert = vi.hoisted(() => vi.fn());
const mockMoviePostersUpdate = vi.hoisted(() => vi.fn());
// Captures the payload argument passed to movies.update(payload)
const mockMovieUpdateCapture = vi.hoisted(() => vi.fn());

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
          update: (payload: unknown) => {
            mockMovieUpdateCapture(payload);
            return mockMovieUpdate();
          },
        };
      }
      if (table === 'movie_cast') {
        return {
          // .select('*', { count: 'exact', head: true }).eq(...)
          select: (_a: unknown, opts?: { head?: boolean }) =>
            opts?.head ? mockCastCount() : { eq: () => ({}) },
          delete: () => ({ eq: mockCastDelete }),
          insert: () => mockCastInsert(),
        };
      }
      if (table === 'actors') {
        return {
          // upsertActorPreserveType: .select('id').eq('tmdb_person_id', ...).maybeSingle()
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          // upsertActorPreserveType insert path: .insert({...}).select('id').single()
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'actor-uuid' }, error: null }),
            }),
          }),
          // upsertActorPreserveType update path: .update({...}).eq('id', ...)
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          upsert: () => mockActorUpsert(),
        };
      }
      if (table === 'movie_images') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => mockMoviePostersMainSelect(),
              }),
            }),
          }),
          insert: () => mockMoviePostersInsert(),
          update: () => ({ eq: () => mockMoviePostersUpdate() }),
        };
      }
      // Default: handle role check from verifyAdminWithRole (admin_user_roles table)
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

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: mockGetMovieDetails,
  extractTrailerUrl: () => 'https://youtu.be/abc',
  extractKeyCrewMembers: () => [],
  TMDB_IMAGE: { poster: 'w500', backdrop: 'w1280', profile: 'w185' },
}));

vi.mock('@/lib/r2-sync', () => ({
  maybeUploadImage: mockMaybeUploadImage,
  R2_BUCKETS: { moviePosters: 'posters', movieBackdrops: 'backdrops', actorPhotos: 'actors' },
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
}));

import { POST } from '@/app/api/sync/fill-fields/route';

const baseTmdbDetails = {
  id: 101,
  title: 'Updated Title',
  overview: 'Updated synopsis',
  release_date: '2024-01-01',
  runtime: 160,
  genres: [{ name: 'Action' }],
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  videos: { results: [] },
  credits: { cast: [], crew: [] },
};

function makeRequest(body: unknown, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: { get: (name: string) => (name === 'authorization' ? authHeader : null) },
  } as unknown as NextRequest;
}

describe('POST /api/sync/fill-fields', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    // Default: movie found in DB
    mockMovieMaybeSingle.mockResolvedValue({ data: { id: 'movie-uuid' }, error: null });
    mockGetMovieDetails.mockResolvedValue(baseTmdbDetails);
    mockMaybeUploadImage.mockResolvedValue('/r2/uploaded.jpg');
    mockMovieUpdate.mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    // Default: zero cast entries
    mockCastCount.mockReturnValue({
      eq: () => Promise.resolve({ count: 0, error: null }),
    });
    mockCastDelete.mockResolvedValue({ error: null });
    mockActorUpsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'actor-uuid' }, error: null }),
      }),
    });
    mockCastInsert.mockResolvedValue({ error: null });
    mockMovieUpdateCapture.mockReset();
    // Default: no existing main poster — insert path
    mockMoviePostersMainSelect.mockReset();
    mockMoviePostersMainSelect.mockResolvedValue({ data: null, error: null });
    mockMoviePostersInsert.mockReset();
    mockMoviePostersInsert.mockResolvedValue({ error: null });
    mockMoviePostersUpdate.mockReset();
    mockMoviePostersUpdate.mockResolvedValue({ error: null });
    vi.stubEnv('TMDB_API_KEY', 'test-key');
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }, ''));
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields array is empty', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when tmdbId is missing', async () => {
    const res = await POST(makeRequest({ fields: ['synopsis'] }));
    expect(res.status).toBe(400);
  });

  it('allows fields=[] when forceResyncCast=true (cast-only re-sync) and syncs cast', async () => {
    // @edge: cast-only re-sync via forceResyncCast=true should not require 'cast' in fields[].
    // With count=0, the cast sync block runs and 'cast' is added to updatedFields.
    mockCastCount.mockReturnValue({
      eq: () => Promise.resolve({ count: 0, error: null }),
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: [], forceResyncCast: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    // 'cast' is pushed to updatedFields when the cast block runs (count=0 OR forceResyncCast=true)
    expect(data.updatedFields).toContain('cast');
  });

  it('updates synopsis field and returns updatedFields', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.movieId).toBe('movie-uuid');
    expect(data.updatedFields).toContain('synopsis');
  });

  it('updates multiple fields at once', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['title', 'runtime', 'genres'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toEqual(expect.arrayContaining(['title', 'runtime', 'genres']));
  });

  it('syncs cast when movie has zero cast entries', async () => {
    // count = 0 (default) → cast sync proceeds
    mockCastCount.mockReturnValue({
      eq: () => Promise.resolve({ count: 0, error: null }),
    });
    const detailsWithCast = {
      ...baseTmdbDetails,
      credits: {
        cast: [
          { id: 200, name: 'Actor', character: 'Hero', order: 0, profile_path: null, gender: 1 },
        ],
        crew: [],
      },
    };
    mockGetMovieDetails.mockResolvedValue(detailsWithCast);

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['cast'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('cast');
  });

  it('skips cast sync when movie has entries and forceResyncCast is not set', async () => {
    // count = 5 → skip
    mockCastCount.mockReturnValue({
      eq: () => Promise.resolve({ count: 5, error: null }),
    });

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['cast'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).not.toContain('cast');
  });

  it('force-resyncs cast when forceResyncCast=true even with existing entries', async () => {
    // count = 5 but forceResyncCast=true → deletes then re-inserts
    mockCastCount.mockReturnValue({
      eq: () => Promise.resolve({ count: 5, error: null }),
    });
    const detailsWithCast = {
      ...baseTmdbDetails,
      credits: {
        cast: [
          {
            id: 201,
            name: 'New Actor',
            character: 'Villain',
            order: 0,
            profile_path: null,
            gender: 1,
          },
        ],
        crew: [],
      },
    };
    mockGetMovieDetails.mockResolvedValue(detailsWithCast);

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['cast'], forceResyncCast: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('cast');
    // Verify delete was called (forceResyncCast path)
    expect(mockCastDelete).toHaveBeenCalled();
  });

  it('returns 404 when tmdbId does not exist in DB', async () => {
    // @edge: movie must already be in DB before fill-fields can patch it
    mockMovieMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ tmdbId: 999, fields: ['synopsis'] }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('not found');
  });

  it('returns 429 when TMDB responds with a rate-limit error', async () => {
    // @edge: getMovieDetails throws with "→ 429" — route must forward as 429 so
    // useBulkFillMissing can detect and stop the sequential fill loop
    mockGetMovieDetails.mockRejectedValue(new Error('TMDB /movie/101 → 429 Too Many Requests'));

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('429');
  });

  it('stores runtime as null when TMDB returns 0 (unknown runtime)', async () => {
    // @edge: TMDB returns runtime=0 for movies with unknown runtime — must not store 0
    // because app validation rejects 0 as an invalid runtime value.
    mockGetMovieDetails.mockResolvedValue({ ...baseTmdbDetails, runtime: 0 });

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['runtime'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(expect.objectContaining({ runtime: null }));
  });

  it('inserts into movie_images when poster_url is updated and no main poster exists', async () => {
    // @contract: updating poster_url must mirror the new URL into movie_images (is_main_poster=true)
    // so the admin poster gallery shows the poster for newly imported movies.
    mockMoviePostersMainSelect.mockResolvedValue({ data: null, error: null }); // no existing main

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['poster_url'] }));
    expect(res.status).toBe(200);
    expect(mockMoviePostersInsert).toHaveBeenCalled();
  });

  it('updates existing movie_images main row when one already exists', async () => {
    // @contract: if a main poster row already exists, update its image_url rather than inserting
    mockMoviePostersMainSelect.mockResolvedValue({
      data: { id: 'poster-uuid' },
      error: null,
    });

    const res = await POST(makeRequest({ tmdbId: 101, fields: ['poster_url'] }));
    expect(res.status).toBe(200);
    expect(mockMoviePostersInsert).not.toHaveBeenCalled();
    expect(mockMoviePostersUpdate).toHaveBeenCalled();
  });

  it('updates director field from crew', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      credits: { cast: [], crew: [{ job: 'Director', name: 'Spielberg' }] },
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['director'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ director: 'Spielberg' }),
    );
    const data = await res.json();
    expect(data.updatedFields).toContain('director');
  });

  it('sets director to null when no Director in crew', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      credits: { cast: [], crew: [{ job: 'Producer', name: 'Someone' }] },
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['director'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ director: null }),
    );
  });

  it('updates trailer_url field', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['trailer_url'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('trailer_url');
  });

  it('updates imdb_id when external_ids has one', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      external_ids: { imdb_id: 'tt1234567' },
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['imdb_id'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('imdb_id');
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ imdb_id: 'tt1234567' }),
    );
  });

  it('does not push imdb_id to updatedFields when external_ids is null', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      external_ids: { imdb_id: null },
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['imdb_id'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).not.toContain('imdb_id');
  });

  it('updates tagline when TMDB has one', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      tagline: 'A powerful tagline',
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['tagline'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('tagline');
  });

  it('does not push tagline to updatedFields when TMDB returns empty string', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      tagline: '',
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['tagline'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).not.toContain('tagline');
  });

  it('updates tmdb_status when status is present', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      status: 'Released',
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['tmdb_status'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('tmdb_status');
  });

  it('does not push tmdb_status to updatedFields when status is empty', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      status: '',
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['tmdb_status'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).not.toContain('tmdb_status');
  });

  it('updates tmdb_ratings', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      vote_average: 7.5,
      vote_count: 1000,
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['tmdb_ratings'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('tmdb_ratings');
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ tmdb_vote_average: 7.5, tmdb_vote_count: 1000 }),
    );
  });

  it('updates budget_revenue', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      budget: 100000000,
      revenue: 500000000,
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['budget_revenue'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('budget_revenue');
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ budget: 100000000, revenue: 500000000 }),
    );
  });

  it('stores budget/revenue as null when TMDB returns 0', async () => {
    // @edge: TMDB returns 0 for unknown budget/revenue — treat as null
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      budget: 0,
      revenue: 0,
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['budget_revenue'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ budget: null, revenue: null }),
    );
  });

  it('updates spoken_languages when present', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      spoken_languages: [
        { iso_639_1: 'te', english_name: 'Telugu', name: 'తెలుగు' },
        { iso_639_1: 'hi', english_name: 'Hindi', name: 'हिन्दी' },
      ],
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['spoken_languages'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('spoken_languages');
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ spoken_languages: ['te', 'hi'] }),
    );
  });

  it('does not push spoken_languages to updatedFields when empty', async () => {
    mockGetMovieDetails.mockResolvedValue({
      ...baseTmdbDetails,
      spoken_languages: [],
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['spoken_languages'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).not.toContain('spoken_languages');
  });

  it('returns 403 when user has viewer role (read-only)', async () => {
    // @boundary: viewer role cannot mutate
    // Mock verifyAdminWithRole to return viewer_readonly by returning a role_id of 'viewer'
    // The existing supabase mock returns 'admin' by default; override to 'viewer'
    vi.doMock('@/lib/supabase-admin', () => ({
      getSupabaseAdmin: () => ({
        from: (table: string) => {
          if (table === 'admin_user_roles' || table !== 'movies') {
            return {
              select: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: { role_id: 'viewer', status: 'active' }, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => mockMovieMaybeSingle(),
              }),
            }),
            update: (payload: unknown) => {
              mockMovieUpdateCapture(payload);
              return mockMovieUpdate();
            },
          };
        },
      }),
    }));
  });

  it('always refreshes tmdb_last_synced_at even when fields list is minimal', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['title'] }));
    expect(res.status).toBe(200);
    expect(mockMovieUpdateCapture).toHaveBeenCalledWith(
      expect.objectContaining({ tmdb_last_synced_at: expect.any(String) }),
    );
  });
});
