import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase-admin', () => ({
  getAuditableSupabaseAdmin: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/sync-engine', () => ({
  processMovieFromTmdb: vi.fn(),
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

import { POST } from '@/app/api/sync/refresh-movie/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb, completeSyncLog } from '@/lib/sync-engine';
import { ensureAdminMutateAuth } from '@/lib/sync-helpers';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/sync/refresh-movie', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
  });
}

describe('POST /api/sync/refresh-movie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: { user: { id: 'admin-5' } as never, role: 'super_admin' },
      apiKey: 'tmdb-key',
    });
  });

  it('returns error when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(makeRequest({ movieId: 'm-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when movieId is missing', async () => {
    const res = await POST(makeRequest({}));
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
    const res = await POST(makeRequest({ movieId: 'missing-id' }));
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
    const res = await POST(makeRequest({ movieId: 'manual-id' }));
    expect(res.status).toBe(400);
  });

  it('uses auditable supabase client with admin user id', async () => {
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

    const res = await POST(makeRequest({ movieId: 'm-1' }));
    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-5');
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

    const res = await POST(makeRequest({ movieId: 'm-1' }));
    expect(res.status).toBe(500);
    expect(completeSyncLog).toHaveBeenCalledWith(
      mockSupabase,
      'log-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
