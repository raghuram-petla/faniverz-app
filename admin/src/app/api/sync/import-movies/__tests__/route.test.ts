import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = { from: vi.fn() };

vi.mock('@/lib/route-wrappers', () => ({
  withSyncAdmin: (_label: string, handler: Function) => handler,
}));

vi.mock('@/lib/sync-engine', () => ({
  processMovieFromTmdb: vi.fn(),
  createSyncLog: vi.fn().mockResolvedValue('log-1'),
  completeSyncLog: vi.fn(),
}));

import { POST } from '@/app/api/sync/import-movies/route';
import { processMovieFromTmdb } from '@/lib/sync-engine';
import { NextRequest } from 'next/server';

function makeCtx(body: Record<string, unknown>) {
  return {
    req: new NextRequest('http://localhost/api/sync/import-movies', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    supabase: mockSupabase,
    auth: { user: { id: 'admin-7' } as never, role: 'admin' },
    apiKey: 'tmdb-key',
  };
}

describe('POST /api/sync/import-movies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when tmdbIds is missing', async () => {
    const res = await POST(makeCtx({}) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when tmdbIds exceeds batch limit', async () => {
    const res = await POST(makeCtx({ tmdbIds: [1, 2, 3, 4, 5, 6] }) as never);
    expect(res.status).toBe(400);
  });

  it('imports movies and returns results', async () => {
    vi.mocked(processMovieFromTmdb).mockResolvedValue({
      movieId: 'm-1',
      title: 'Test',
      isNew: true,
    } as never);

    const res = await POST(makeCtx({ tmdbIds: [123] }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
  });

  it('handles partial failures gracefully', async () => {
    vi.mocked(processMovieFromTmdb)
      .mockResolvedValueOnce({ movieId: 'm-1', title: 'OK', isNew: true } as never)
      .mockRejectedValueOnce(new Error('TMDB 404'));

    const res = await POST(makeCtx({ tmdbIds: [1, 2] }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.errors).toHaveLength(1);
  });
});
