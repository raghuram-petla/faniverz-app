import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockGetUser = vi.fn();
const mockProcessActorRefresh = vi.fn();
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

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
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
  }),
}));

vi.mock('@/lib/sync-engine', () => ({
  processActorRefresh: (...args: unknown[]) => mockProcessActorRefresh(...args),
  createSyncLog: (...args: unknown[]) => mockCreateSyncLog(...args),
  completeSyncLog: (...args: unknown[]) => mockCompleteSyncLog(...args),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/refresh-actor/route';

describe('POST /api/sync/refresh-actor', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockProcessActorRefresh.mockReset();
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
    const res = await POST(makeRequest({ actorId: 'actor-1' }, ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ actorId: 'actor-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when actorId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when actor is not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const res = await POST(makeRequest({ actorId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when actor has no tmdb_person_id', async () => {
    mockSingle.mockResolvedValue({
      data: { tmdb_person_id: null, name: 'Test Actor' },
      error: null,
    });
    const res = await POST(makeRequest({ actorId: 'actor-1' }));
    expect(res.status).toBe(400);
  });

  it('refreshes actor and returns result', async () => {
    mockSingle.mockResolvedValue({
      data: { tmdb_person_id: 500, name: 'Test Actor' },
      error: null,
    });
    mockProcessActorRefresh.mockResolvedValue({ updated: true });

    const res = await POST(makeRequest({ actorId: 'actor-1' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.syncLogId).toBe('sync-log-1');
    expect(data.result).toEqual({ updated: true });
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ details: ['Test Actor'] }),
    );
  });

  // Note: 403 viewer_readonly path is tested via sync-helpers.test.ts verifyAdminCanMutate tests

  it('returns 503 when TMDB_API_KEY is not configured', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    delete process.env.TMDB_API_KEY;
    const res = await POST(makeRequest({ actorId: 'actor-1' }));
    expect(res.status).toBe(503);
  });

  it('returns 500 and logs sync failure when processActorRefresh throws', async () => {
    mockSingle.mockResolvedValue({
      data: { tmdb_person_id: 500, name: 'Failing Actor' },
      error: null,
    });
    mockProcessActorRefresh.mockRejectedValue(new Error('TMDB fetch failed'));

    const res = await POST(makeRequest({ actorId: 'actor-1' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('TMDB fetch failed');
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({
        status: 'failed',
        errors: [expect.objectContaining({ actorId: 'actor-1', message: 'TMDB fetch failed' })],
      }),
    );
  });

  it('returns 500 with fallback message for non-Error thrown during refresh', async () => {
    mockSingle.mockResolvedValue({
      data: { tmdb_person_id: 500, name: 'Actor X' },
      error: null,
    });
    mockProcessActorRefresh.mockRejectedValue('string error');

    const res = await POST(makeRequest({ actorId: 'actor-1' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Unknown error');
  });
});
