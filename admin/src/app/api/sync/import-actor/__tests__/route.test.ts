import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase-admin', () => ({
  getAuditableSupabaseAdmin: vi.fn(() => mockSupabase),
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

import { POST } from '@/app/api/sync/import-actor/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { getPersonDetails } from '@/lib/tmdb';
import { maybeUploadImage } from '@/lib/r2-sync';
import { ensureAdminMutateAuth } from '@/lib/sync-helpers';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/sync/import-actor', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
  });
}

describe('POST /api/sync/import-actor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: { user: { id: 'admin-3' } as never, role: 'admin' },
      apiKey: 'tmdb-key',
    });
  });

  it('returns error when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(makeRequest({ tmdbPersonId: 1 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tmdbPersonId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('uses auditable supabase client with admin user id', async () => {
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

    const res = await POST(makeRequest({ tmdbPersonId: 789 }));
    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-3');
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

    const res = await POST(makeRequest({ tmdbPersonId: 789 }));
    expect(res.status).toBe(500);
  });
});
