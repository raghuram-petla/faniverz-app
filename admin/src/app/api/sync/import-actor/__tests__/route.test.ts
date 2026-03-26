import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/route-wrappers', () => ({
  withSyncAdmin: (_label: string, handler: Function) => handler,
}));

vi.mock('@/lib/tmdb', () => ({
  getPersonDetails: vi.fn(),
  TMDB_IMAGE: {
    profile: (p: string) => `https://tmdb.org/w185${p}`,
  },
}));

vi.mock('@/lib/r2-sync', () => ({
  maybeUploadImage: vi.fn(),
  R2_BUCKETS: { actorPhotos: 'photos' },
}));

vi.mock('@/lib/sync-engine', () => ({
  createSyncLog: vi.fn().mockResolvedValue('log-1'),
  completeSyncLog: vi.fn(),
}));

import { POST } from '@/app/api/sync/import-actor/route';
import { getPersonDetails } from '@/lib/tmdb';
import { maybeUploadImage } from '@/lib/r2-sync';
import { NextRequest } from 'next/server';

function makeCtx(body: Record<string, unknown>) {
  return {
    req: new NextRequest('http://localhost/api/sync/import-actor', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    supabase: mockSupabase,
    auth: { user: { id: 'admin-3' } as never, role: 'admin' },
    apiKey: 'tmdb-key',
  };
}

describe('POST /api/sync/import-actor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when tmdbPersonId is missing', async () => {
    const res = await POST(makeCtx({}) as never);
    expect(res.status).toBe(400);
  });

  it('imports actor successfully', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      name: 'Test Actor',
      biography: 'Bio',
      place_of_birth: 'Place',
      birthday: '1990-01-01',
      profile_path: '/photo.jpg',
      gender: 1,
    } as never);
    vi.mocked(maybeUploadImage).mockResolvedValue('uploaded.jpg');
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'actor-1' }, error: null }),
        }),
      }),
    });

    const res = await POST(makeCtx({ tmdbPersonId: 789 }) as never);
    expect(res.status).toBe(200);
  });

  it('returns 500 when upsert fails', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      name: 'Actor',
      biography: '',
      place_of_birth: null,
      birthday: null,
      profile_path: null,
      gender: null,
    } as never);
    vi.mocked(maybeUploadImage).mockResolvedValue(null);
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Duplicate key' },
          }),
        }),
      }),
    });

    const res = await POST(makeCtx({ tmdbPersonId: 789 }) as never);
    expect(res.status).toBe(500);
  });
});
