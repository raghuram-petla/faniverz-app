import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

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

import { POST } from '@/app/api/sync/refresh-actor/route';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

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
  });
});
