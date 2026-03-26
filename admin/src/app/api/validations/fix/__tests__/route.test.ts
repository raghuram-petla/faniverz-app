import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase-admin', () => ({
  getAuditableSupabaseAdmin: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/r2-client', () => ({
  getR2Client: vi.fn(() => ({ send: vi.fn() })),
}));

vi.mock('@/lib/r2-sync', () => ({
  uploadImageFromUrl: vi.fn().mockResolvedValue('new-key.jpg'),
}));

vi.mock('@/lib/image-resize', () => ({
  generateVariants: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/variant-config', () => ({
  VARIANT_SPECS: { poster: [], backdrop: [], photo: [], avatar: [] },
}));

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdminCanMutate: vi.fn(),
  unauthorizedResponse: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
  viewerReadonlyResponse: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Viewer role is read-only' }, { status: 403 });
  }),
}));

import { POST } from '@/app/api/validations/fix/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminCanMutate } from '@/lib/sync-helpers';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/validations/fix', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
  });
}

describe('POST /api/validations/fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminCanMutate).mockResolvedValue({
      user: { id: 'admin-11' } as never,
      role: 'super_admin',
    });
  });

  it('returns 401 when auth fails', async () => {
    vi.mocked(verifyAdminCanMutate).mockResolvedValue(null);
    const res = await POST(makeRequest({ items: [{ id: '1', field: 'poster_url' }] }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    vi.mocked(verifyAdminCanMutate).mockResolvedValue('viewer_readonly');
    const res = await POST(makeRequest({ items: [{ id: '1', field: 'poster_url' }] }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when items is empty', async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when items exceeds max', async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      id: `${i}`,
      field: 'poster_url',
      entity: 'movies',
      fixType: 'migrate_external',
      currentUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
    }));
    const res = await POST(makeRequest({ items }));
    expect(res.status).toBe(400);
  });

  it('uses auditable supabase client and passes correct URL to DB', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { uploadImageFromUrl } = await import('@/lib/r2-sync');

    const res = await POST(
      makeRequest({
        items: [
          {
            id: 'movie-1',
            field: 'poster_url',
            entity: 'movies',
            fixType: 'migrate_external',
            currentUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-11');
    expect(uploadImageFromUrl).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/original/test.jpg',
      'faniverz-movie-posters',
      'test.jpg',
    );
    expect(mockUpdate).toHaveBeenCalledWith({ poster_url: 'new-key.jpg' });
  });
});
