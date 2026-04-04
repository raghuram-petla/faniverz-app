import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/route-wrappers', () => ({
  withMutationAdmin: (_label: string, handler: Function) => handler,
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

import { POST } from '@/app/api/validations/fix/route';
import { makeRouteWrapperCtx } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeRouteWrapperCtx helper to build route-wrapper context objects.
// @edge includeApiKey=false because validations/fix handler does not receive apiKey in context.
function makeCtx(body: Record<string, unknown>) {
  return makeRouteWrapperCtx(
    'http://localhost/api/validations/fix',
    body,
    mockSupabase as never,
    { userId: 'admin-11', role: 'super_admin', includeApiKey: false },
  );
}

describe('POST /api/validations/fix', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when items is empty', async () => {
    const res = await POST(makeCtx({ items: [] }) as never);
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
    const res = await POST(makeCtx({ items }) as never);
    expect(res.status).toBe(400);
  });

  it('fixes items and passes correct URL to DB', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { uploadImageFromUrl } = await import('@/lib/r2-sync');

    const res = await POST(
      makeCtx({
        items: [
          {
            id: 'movie-1',
            field: 'poster_url',
            entity: 'movies',
            fixType: 'migrate_external',
            currentUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
          },
        ],
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(uploadImageFromUrl).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/original/test.jpg',
      'faniverz-movie-posters',
      'test.jpg',
    );
    expect(mockUpdate).toHaveBeenCalledWith({ poster_url: 'new-key.jpg' });
  });
});
