import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = { from: vi.fn() };

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

import { POST } from '@/app/api/sync/import-movies/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { processMovieFromTmdb } from '@/lib/sync-engine';
import { ensureAdminMutateAuth } from '@/lib/sync-helpers';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/sync/import-movies', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
  });
}

describe('POST /api/sync/import-movies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: { user: { id: 'admin-7' } as never, role: 'admin' },
      apiKey: 'tmdb-key',
    });
  });

  it('returns error when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(makeRequest({ tmdbIds: [1] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tmdbIds is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when tmdbIds exceeds batch limit', async () => {
    const res = await POST(makeRequest({ tmdbIds: [1, 2, 3, 4, 5, 6] }));
    expect(res.status).toBe(400);
  });

  it('uses auditable supabase client with admin user id', async () => {
    vi.mocked(processMovieFromTmdb).mockResolvedValue({
      movieId: 'm-1',
      title: 'Test',
      isNew: true,
    } as never);

    const res = await POST(makeRequest({ tmdbIds: [123] }));
    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-7');

    const body = await res.json();
    expect(body.results).toHaveLength(1);
  });

  it('handles partial failures gracefully', async () => {
    vi.mocked(processMovieFromTmdb)
      .mockResolvedValueOnce({ movieId: 'm-1', title: 'OK', isNew: true } as never)
      .mockRejectedValueOnce(new Error('TMDB 404'));

    const res = await POST(makeRequest({ tmdbIds: [1, 2] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.errors).toHaveLength(1);
  });
});
