import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

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

import { POST } from '@/app/api/sync/import-movies/route';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

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
    mockProcessMovieFromTmdb.mockResolvedValue({ isNew: true, movieId: 'movie-1' });

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.syncLogId).toBe('sync-log-1');
    expect(data.results).toHaveLength(1);
    expect(data.errors).toHaveLength(0);
  });

  it('records errors for failed movie imports', async () => {
    mockProcessMovieFromTmdb.mockRejectedValue(new Error('TMDB fetch failed'));

    const res = await POST(makeRequest({ tmdbIds: [100] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toEqual({ tmdbId: 100, message: 'TMDB fetch failed' });
  });
});
