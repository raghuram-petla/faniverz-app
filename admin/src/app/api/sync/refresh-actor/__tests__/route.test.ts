import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase-admin', () => ({
  getAuditableSupabaseAdmin: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/sync-engine', () => ({
  processActorRefresh: vi.fn(),
  createSyncLog: vi.fn().mockResolvedValue('log-1'),
  completeSyncLog: vi.fn(),
}));

vi.mock('@/lib/sync-helpers', () => ({
  ensureAdminMutateAuth: vi.fn(),
  errorResponse: vi.fn((_label: string, err: unknown) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }),
}));

import { POST } from '@/app/api/sync/refresh-actor/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { processActorRefresh, completeSyncLog } from '@/lib/sync-engine';
import { ensureAdminMutateAuth } from '@/lib/sync-helpers';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/sync/refresh-actor', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
  });
}

describe('POST /api/sync/refresh-actor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: { user: { id: 'admin-9' } as never, role: 'admin' },
      apiKey: 'tmdb-key',
    });
  });

  it('returns error when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(makeRequest({ actorId: 'a-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when actorId is missing', async () => {
    const res = await POST(makeRequest({}));
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
    const res = await POST(makeRequest({ actorId: 'missing' }));
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
    const res = await POST(makeRequest({ actorId: 'manual-id' }));
    expect(res.status).toBe(400);
  });

  it('uses auditable supabase client with admin user id', async () => {
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

    const res = await POST(makeRequest({ actorId: 'a-1' }));
    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-9');
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

    const res = await POST(makeRequest({ actorId: 'a-1' }));
    expect(res.status).toBe(500);
    expect(completeSyncLog).toHaveBeenCalledWith(
      mockSupabase,
      'log-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
