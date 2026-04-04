import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockGetUser = vi.fn();
const mockProcessMovieFromTmdb = vi.fn();
const mockCreateSyncLog = vi.fn();
const mockCompleteSyncLog = vi.fn();
const mockSingle = vi.fn();

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

vi.mock('@/lib/supabase-admin', () => {
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single:
            table === 'admin_user_roles'
              ? () => Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null })
              : mockSingle,
        }),
      }),
    }),
  };
  return {
    getSupabaseAdmin: () => client,
    getAuditableSupabaseAdmin: () => client,
  };
});

vi.mock('@/lib/sync-engine', () => ({
  processMovieFromTmdb: (...args: unknown[]) => mockProcessMovieFromTmdb(...args),
  createSyncLog: (...args: unknown[]) => mockCreateSyncLog(...args),
  completeSyncLog: (...args: unknown[]) => mockCompleteSyncLog(...args),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/refresh-movie/route';

describe('POST /api/sync/refresh-movie', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockProcessMovieFromTmdb.mockReset();
    mockCreateSyncLog.mockReset();
    mockCompleteSyncLog.mockReset();
    mockSingle.mockReset();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key');
    mockCreateSyncLog.mockResolvedValue('sync-log-1');
    mockCompleteSyncLog.mockResolvedValue(undefined);
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ movieId: 'movie-1' }, ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when movieId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when movie is not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const res = await POST(makeRequest({ movieId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when movie has no tmdb_id', async () => {
    mockSingle.mockResolvedValue({ data: { tmdb_id: null, title: 'Test' }, error: null });
    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(400);
  });

  it('refreshes movie and returns result', async () => {
    mockSingle.mockResolvedValue({ data: { tmdb_id: 100, title: 'Test Movie' }, error: null });
    mockProcessMovieFromTmdb.mockResolvedValue({ updated: true });

    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.syncLogId).toBe('sync-log-1');
    expect(data.result).toEqual({ updated: true });
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ details: ['Test Movie'] }),
    );
  });

  // Note: 403 viewer_readonly path is tested via sync-helpers.test.ts verifyAdminCanMutate tests

  it('returns 503 when TMDB_API_KEY is not configured', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    delete process.env.TMDB_API_KEY;
    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(503);
  });

  it('returns 500 and logs sync failure when processMovieFromTmdb throws', async () => {
    mockSingle.mockResolvedValue({ data: { tmdb_id: 100, title: 'Failing Movie' }, error: null });
    mockProcessMovieFromTmdb.mockRejectedValue(new Error('TMDB API timeout'));

    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Movie refresh failed');
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({
        status: 'failed',
        errors: [expect.objectContaining({ movieId: 'movie-1', message: 'TMDB API timeout' })],
      }),
    );
  });

  it('returns 500 with fallback message for non-Error thrown during refresh', async () => {
    mockSingle.mockResolvedValue({ data: { tmdb_id: 100, title: 'Movie X' }, error: null });
    mockProcessMovieFromTmdb.mockRejectedValue('string error');

    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Movie refresh failed');
  });

  it('returns 500 via errorResponse when outer try/catch fires', async () => {
    const badRequest = {
      json: async () => {
        throw new Error('parse error');
      },
      headers: { get: () => 'Bearer valid-token' },
    } as unknown as import('next/server').NextRequest;
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });

  it('returns 404 when movie lookup returns null data without error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ movieId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when movieId is empty string', async () => {
    const res = await POST(makeRequest({ movieId: '' }));
    expect(res.status).toBe(400);
  });

  it('logs moviesUpdated=1 on successful refresh', async () => {
    mockSingle.mockResolvedValue({ data: { tmdb_id: 100, title: 'Movie Y' }, error: null });
    mockProcessMovieFromTmdb.mockResolvedValue({ updated: true });
    const res = await POST(makeRequest({ movieId: 'movie-1' }));
    expect(res.status).toBe(200);
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ moviesUpdated: 1 }),
    );
  });
});
