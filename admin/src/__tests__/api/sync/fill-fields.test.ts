import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

// @boundary: use vi.hoisted so variables are available when vi.mock factory runs
const mockGetUser = vi.hoisted(() => vi.fn());
const mockMovieMaybeSingle = vi.hoisted(() => vi.fn());
const mockProcessMovieFromTmdb = vi.hoisted(() => vi.fn());

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

// @contract: fill-fields now delegates to processMovieFromTmdb (single source of truth).
// These tests verify the route's orchestration, not the sync engine's field-level logic
// (which is tested in sync-engine.test.ts).
vi.mock('@/lib/sync-engine', () => ({
  processMovieFromTmdb: mockProcessMovieFromTmdb,
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/fill-fields/route';

describe('POST /api/sync/fill-fields', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: 'te' },
      error: null,
    });
    mockProcessMovieFromTmdb.mockReset();
    mockProcessMovieFromTmdb.mockResolvedValue({
      movieId: 'movie-uuid',
      title: 'Test Movie',
      tmdbId: 101,
      isNew: false,
      castCount: 5,
      crewCount: 3,
      posterCount: 2,
      backdropCount: 1,
    });
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

  it('returns 404 when tmdbId does not exist in DB', async () => {
    mockMovieMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ tmdbId: 999, fields: ['synopsis'] }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('not found');
  });

  it('calls processMovieFromTmdb with resumable=true for normal fill', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis', 'images'] }));
    expect(res.status).toBe(200);
    expect(mockProcessMovieFromTmdb).toHaveBeenCalledWith(
      101,
      'test-key',
      expect.anything(),
      expect.objectContaining({ resumable: true, originalLanguage: 'te' }),
    );
    const data = await res.json();
    expect(data.movieId).toBe('movie-uuid');
    expect(data.updatedFields).toEqual(['synopsis', 'images']);
  });

  it('calls processMovieFromTmdb with resumable=false when forceResyncCast=true', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['cast'], forceResyncCast: true }));
    expect(res.status).toBe(200);
    expect(mockProcessMovieFromTmdb).toHaveBeenCalledWith(
      101,
      'test-key',
      expect.anything(),
      expect.objectContaining({ resumable: false }),
    );
  });

  it('allows fields=[] when forceResyncCast=true and includes cast in updatedFields', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: [], forceResyncCast: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toContain('cast');
  });

  it('does not duplicate cast in updatedFields when already in fields', async () => {
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['cast'], forceResyncCast: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields.filter((f: string) => f === 'cast')).toHaveLength(1);
  });

  it('returns requested fields as updatedFields', async () => {
    const fields = ['title', 'runtime', 'genres', 'videos', 'keywords'];
    const res = await POST(makeRequest({ tmdbId: 101, fields }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updatedFields).toEqual(fields);
  });

  it('returns 429 when processMovieFromTmdb throws rate-limit error', async () => {
    mockProcessMovieFromTmdb.mockRejectedValue(
      new Error('TMDB /movie/101 → 429 Too Many Requests'),
    );
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('429');
  });

  it('returns 500 for unexpected errors', async () => {
    mockProcessMovieFromTmdb.mockRejectedValue(new Error('Unexpected DB crash'));
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['synopsis'] }));
    expect(res.status).toBe(500);
  });

  it('does not pass originalLanguage when movie is English', async () => {
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: 'en' },
      error: null,
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['videos'] }));
    expect(res.status).toBe(200);
    expect(mockProcessMovieFromTmdb).toHaveBeenCalledWith(
      101,
      'test-key',
      expect.anything(),
      expect.objectContaining({ originalLanguage: undefined }),
    );
  });

  it('passes originalLanguage when movie is non-English', async () => {
    mockMovieMaybeSingle.mockResolvedValue({
      data: { id: 'movie-uuid', original_language: 'hi' },
      error: null,
    });
    const res = await POST(makeRequest({ tmdbId: 101, fields: ['videos'] }));
    expect(res.status).toBe(200);
    expect(mockProcessMovieFromTmdb).toHaveBeenCalledWith(
      101,
      'test-key',
      expect.anything(),
      expect.objectContaining({ originalLanguage: 'hi' }),
    );
  });
});
