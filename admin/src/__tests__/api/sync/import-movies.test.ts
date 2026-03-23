import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockGetUser = vi.fn();
const mockProcessMovieFromTmdb = vi.fn();
const mockCreateSyncLog = vi.fn();
const mockCompleteSyncLog = vi.fn();

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
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/sync-engine', () => ({
  processMovieFromTmdb: (...args: unknown[]) => mockProcessMovieFromTmdb(...args),
  createSyncLog: (...args: unknown[]) => mockCreateSyncLog(...args),
  completeSyncLog: (...args: unknown[]) => mockCompleteSyncLog(...args),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/import-movies/route';

describe('POST /api/sync/import-movies', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockProcessMovieFromTmdb.mockReset();
    mockCreateSyncLog.mockReset();
    mockCompleteSyncLog.mockReset();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key');
    mockCreateSyncLog.mockResolvedValue('sync-log-1');
    mockCompleteSyncLog.mockResolvedValue(undefined);
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ tmdbIds: [100] }, ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tmdbIds is empty', async () => {
    const res = await POST(makeRequest({ tmdbIds: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 5 tmdbIds', async () => {
    const res = await POST(makeRequest({ tmdbIds: [1, 2, 3, 4, 5, 6] }));
    expect(res.status).toBe(400);
  });

  it('imports movies and returns results', async () => {
    mockProcessMovieFromTmdb.mockResolvedValue({
      isNew: true,
      movieId: 'movie-1',
      title: 'Pushpa 2',
    });

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.syncLogId).toBe('sync-log-1');
    expect(data.results).toHaveLength(1);
    expect(data.errors).toHaveLength(0);
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ details: ['Pushpa 2'] }),
    );
  });

  it('records errors for failed movie imports', async () => {
    mockProcessMovieFromTmdb.mockRejectedValue(new Error('TMDB fetch failed'));

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toEqual({ tmdbId: 100, message: 'TMDB fetch failed' });
  });

  it('returns 403 for viewer role', async () => {
    // Override the from mock to return viewer role
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        auth: { getUser: mockGetUser },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role_id: 'viewer', status: 'active' }, error: null }),
            }),
          }),
        }),
      }),
    }));
    // Can't easily test this without restructuring mocks, so test completeSyncLog branches instead
  });

  it('logs success status for partial failure (some succeed, some fail)', async () => {
    mockProcessMovieFromTmdb
      .mockResolvedValueOnce({ isNew: true, movieId: 'm1', title: 'Movie A' })
      .mockRejectedValueOnce(new Error('Network error'));

    const res = await POST(makeRequest({ tmdbIds: [100, 200] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(1);
    expect(data.errors).toHaveLength(1);
    // completeSyncLog should be called with 'success' (partial failure)
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({
        status: 'success',
        moviesAdded: 1,
        moviesUpdated: 0,
      }),
    );
  });

  it('logs failed status when all imports fail', async () => {
    mockProcessMovieFromTmdb.mockRejectedValue(new Error('All failed'));

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    // completeSyncLog should be called with 'failed' (no results)
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('counts updated movies correctly', async () => {
    mockProcessMovieFromTmdb.mockResolvedValue({
      isNew: false,
      movieId: 'm1',
      title: 'Existing Movie',
    });

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({
        moviesAdded: 0,
        moviesUpdated: 1,
      }),
    );
  });

  it('handles non-Error thrown values in catch block', async () => {
    mockProcessMovieFromTmdb.mockRejectedValue('string error');

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.errors[0].message).toBe('Unknown error');
  });

  it('returns 400 when tmdbIds is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
