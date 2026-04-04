import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/route-wrappers', () => ({
  withSyncAdmin: (_label: string, handler: Function) => handler,
}));

vi.mock('@/lib/sync-engine', () => ({
  processActorRefresh: vi.fn(),
  createSyncLog: vi.fn().mockResolvedValue('log-1'),
  completeSyncLog: vi.fn(),
}));

import { POST } from '@/app/api/sync/refresh-actor/route';
import { processActorRefresh, completeSyncLog } from '@/lib/sync-engine';
import { makeRouteWrapperCtx } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeRouteWrapperCtx helper to build route-wrapper context objects.
function makeCtx(body: Record<string, unknown>) {
  return makeRouteWrapperCtx(
    'http://localhost/api/sync/refresh-actor',
    body,
    mockSupabase as never,
    { userId: 'admin-9', role: 'admin' },
  );
}

describe('POST /api/sync/refresh-actor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when actorId is missing', async () => {
    const res = await POST(makeCtx({}) as never);
    expect(res.status).toBe(400);
  });

  it('returns 404 when actor not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    });
    const res = await POST(makeCtx({ actorId: 'missing' }) as never);
    expect(res.status).toBe(404);
  });

  it('returns 400 when actor has no tmdb_person_id', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tmdb_person_id: null, name: 'Manual Actor' },
            error: null,
          }),
        }),
      }),
    });
    const res = await POST(makeCtx({ actorId: 'manual-id' }) as never);
    expect(res.status).toBe(400);
  });

  it('refreshes actor successfully', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tmdb_person_id: 456, name: 'Actor Name' },
            error: null,
          }),
        }),
      }),
    });
    vi.mocked(processActorRefresh).mockResolvedValue({ updated: true } as never);

    const res = await POST(makeCtx({ actorId: 'a-1' }) as never);
    expect(res.status).toBe(200);
  });

  it('logs failure when processActorRefresh throws', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tmdb_person_id: 456, name: 'Actor' },
            error: null,
          }),
        }),
      }),
    });
    vi.mocked(processActorRefresh).mockRejectedValue(new Error('API error'));

    const res = await POST(makeCtx({ actorId: 'a-1' }) as never);
    expect(res.status).toBe(500);
    expect(completeSyncLog).toHaveBeenCalledWith(
      mockSupabase,
      'log-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
