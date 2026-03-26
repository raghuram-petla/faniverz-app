import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockVerifyAdminCanMutate = vi.fn();
const mockEnsureTmdbApiKey = vi.fn();
const mockGetPersonDetails = vi.fn();
const mockMaybeUploadImage = vi.fn();
const mockCreateSyncLog = vi.fn();
const mockCompleteSyncLog = vi.fn();
const mockUpsertSelect = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdminCanMutate: (...args: unknown[]) => mockVerifyAdminCanMutate(...args),
  ensureTmdbApiKey: () => mockEnsureTmdbApiKey(),
  // @contract ensureAdminMutateAuth delegates to verifyAdminCanMutate + ensureTmdbApiKey
  ensureAdminMutateAuth: async (authHeader: string | null) => {
    const auth = await mockVerifyAdminCanMutate(authHeader);
    if (auth === 'viewer_readonly') {
      return {
        ok: false,
        response: {
          status: 403,
          body: { error: 'Viewer role is read-only' },
          async json() {
            return this.body;
          },
        },
      };
    }
    if (!auth) {
      return {
        ok: false,
        response: {
          status: 401,
          body: { error: 'Unauthorized' },
          async json() {
            return this.body;
          },
        },
      };
    }
    const tmdb = mockEnsureTmdbApiKey();
    if (!tmdb.ok) {
      return { ok: false, response: tmdb.response };
    }
    return { ok: true, auth, apiKey: tmdb.apiKey };
  },
  errorResponse: (label: string, err: unknown) => ({
    body: { error: err instanceof Error ? err.message : `${label} failed` },
    status: 500,
    async json() {
      return this.body;
    },
  }),
}));

vi.mock('@/lib/supabase-admin', () => {
  const client = {
    from: () => ({
      upsert: () => ({
        select: () => ({
          single: () => mockUpsertSelect(),
        }),
      }),
    }),
  };
  return {
    getSupabaseAdmin: () => client,
    getAuditableSupabaseAdmin: () => client,
  };
});

vi.mock('@/lib/tmdb', () => ({
  getPersonDetails: (...args: unknown[]) => mockGetPersonDetails(...args),
  TMDB_IMAGE: { profile: 'w185' },
}));

vi.mock('@/lib/r2-sync', () => ({
  maybeUploadImage: (...args: unknown[]) => mockMaybeUploadImage(...args),
  R2_BUCKETS: { actorPhotos: 'faniverz-actor-photos' },
}));

vi.mock('@/lib/sync-engine', () => ({
  createSyncLog: (...args: unknown[]) => mockCreateSyncLog(...args),
  completeSyncLog: (...args: unknown[]) => mockCompleteSyncLog(...args),
}));

vi.mock('crypto', async (importOriginal) => {
  const mod = await importOriginal<typeof import('crypto')>();
  return {
    ...mod,
    default: { ...mod, randomUUID: () => 'test-uuid' as const },
    randomUUID: () => 'test-uuid' as const,
  };
});

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/import-actor/route';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminCanMutate.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' });
  mockEnsureTmdbApiKey.mockReturnValue({ ok: true, apiKey: 'test-key' });
  mockCreateSyncLog.mockResolvedValue('sync-log-1');
});

describe('POST /api/sync/import-actor', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyAdminCanMutate.mockResolvedValue(null);
    const res = await POST(makeRequest({ tmdbPersonId: 123 }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    mockVerifyAdminCanMutate.mockResolvedValue('viewer_readonly');
    const res = await POST(makeRequest({ tmdbPersonId: 123 }));
    expect(res.status).toBe(403);
  });

  it('returns error when TMDB_API_KEY is missing', async () => {
    mockEnsureTmdbApiKey.mockReturnValue({
      ok: false,
      response: { body: { error: 'TMDB_API_KEY is not configured.' }, status: 503 },
    });
    const res = await POST(makeRequest({ tmdbPersonId: 123 }));
    expect(res.status).toBe(503);
  });

  it('returns 400 when tmdbPersonId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('tmdbPersonId is required.');
  });

  it('successfully imports an actor', async () => {
    mockGetPersonDetails.mockResolvedValue({
      name: 'Test Actor',
      biography: 'A bio',
      place_of_birth: 'Hyderabad',
      birthday: '1990-01-01',
      profile_path: '/photo.jpg',
      gender: 1,
    });
    mockMaybeUploadImage.mockResolvedValue('https://r2.example.com/photo.jpg');
    mockUpsertSelect.mockResolvedValue({ data: { id: 'actor-1' }, error: null });

    const res = await POST(makeRequest({ tmdbPersonId: 456 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.actorId).toBe('actor-1');
    expect(json.result.name).toBe('Test Actor');
    expect(json.syncLogId).toBe('sync-log-1');
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('returns 500 and logs failure when upsert fails', async () => {
    mockGetPersonDetails.mockResolvedValue({
      name: 'Actor',
      biography: '',
      place_of_birth: null,
      birthday: null,
      profile_path: null,
      gender: null,
    });
    mockMaybeUploadImage.mockResolvedValue(null);
    mockUpsertSelect.mockResolvedValue({ data: null, error: { message: 'Conflict' } });

    const res = await POST(makeRequest({ tmdbPersonId: 789 }));
    expect(res.status).toBe(500);
    expect(mockCompleteSyncLog).toHaveBeenCalledWith(
      expect.anything(),
      'sync-log-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('handles TMDB fetch failure', async () => {
    mockGetPersonDetails.mockRejectedValue(new Error('TMDB down'));
    const res = await POST(makeRequest({ tmdbPersonId: 999 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('TMDB down');
  });

  it('handles non-Error thrown in inner catch (fallback to Unknown error)', async () => {
    mockGetPersonDetails.mockRejectedValue('string-error');
    const res = await POST(makeRequest({ tmdbPersonId: 999 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Unknown error');
  });

  it('returns 500 via errorResponse when outer try/catch fires', async () => {
    // Force request.json() to throw to trigger the outer catch
    const badRequest = {
      json: async () => {
        throw new Error('Invalid JSON');
      },
      headers: { get: () => 'Bearer valid-token' },
    } as unknown as import('next/server').NextRequest;
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });

  it('handles person with undefined gender (nullish coalescing to null)', async () => {
    mockGetPersonDetails.mockResolvedValue({
      name: 'No Gender Actor',
      biography: 'Bio',
      place_of_birth: 'Unknown',
      birthday: '1985-06-15',
      profile_path: '/photo.jpg',
      gender: undefined,
    });
    mockMaybeUploadImage.mockResolvedValue('https://r2.example.com/photo.jpg');
    mockUpsertSelect.mockResolvedValue({ data: { id: 'actor-2' }, error: null });

    const res = await POST(makeRequest({ tmdbPersonId: 111 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.actorId).toBe('actor-2');
  });

  it('returns 400 when tmdbPersonId is falsy (zero)', async () => {
    const res = await POST(makeRequest({ tmdbPersonId: 0 }));
    expect(res.status).toBe(400);
  });
});
