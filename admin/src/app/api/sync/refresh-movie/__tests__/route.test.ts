import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/route-wrappers', () => ({
  withSyncAdmin: (_label: string, handler: Function) => handler,
}));

vi.mock('@/lib/sync-engine', () => ({
  processMovieFromTmdb: vi.fn(),
  createSyncLog: vi.fn().mockResolvedValue('log-1'),
  completeSyncLog: vi.fn(),
}));

import { POST } from '@/app/api/sync/refresh-movie/route';
import { processMovieFromTmdb, completeSyncLog } from '@/lib/sync-engine';
import { makeRouteWrapperCtx } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeRouteWrapperCtx helper to build route-wrapper context objects.
function makeCtx(body: Record<string, unknown>) {
  return makeRouteWrapperCtx(
    'http://localhost/api/sync/refresh-movie',
    body,
    mockSupabase as never,
    { userId: 'admin-5', role: 'super_admin' },
  );
}

describe('POST /api/sync/refresh-movie', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when movieId is missing', async () => {
    const res = await POST(makeCtx({}) as never);
    expect(res.status).toBe(400);
  });

  it('returns 404 when movie not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    });
    const res = await POST(makeCtx({ movieId: 'missing-id' }) as never);
    expect(res.status).toBe(404);
  });

  it('returns 400 when movie has no tmdb_id', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { tmdb_id: null, title: 'Manual' }, error: null }),
        }),
      }),
    });
    const res = await POST(makeCtx({ movieId: 'manual-id' }) as never);
    expect(res.status).toBe(400);
  });

  it('refreshes movie successfully', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { tmdb_id: 123, title: 'Test Movie' }, error: null }),
        }),
      }),
    });
    vi.mocked(processMovieFromTmdb).mockResolvedValue({
      movieId: 'm-1',
      title: 'Test Movie',
      isNew: false,
    } as never);

    const res = await POST(makeCtx({ movieId: 'm-1' }) as never);
    expect(res.status).toBe(200);
  });

  it('logs failure when processMovieFromTmdb throws', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { tmdb_id: 123, title: 'Test' }, error: null }),
        }),
      }),
    });
    vi.mocked(processMovieFromTmdb).mockRejectedValue(new Error('TMDB down'));

    const res = await POST(makeCtx({ movieId: 'm-1' }) as never);
    expect(res.status).toBe(500);
    expect(completeSyncLog).toHaveBeenCalledWith(
      mockSupabase,
      'log-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
