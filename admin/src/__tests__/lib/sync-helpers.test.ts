import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

// Mock supabase createClient
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import {
  ensureTmdbApiKey,
  verifyBearer,
  verifyAdmin,
  verifyAdminWithRole,
  verifyAdminCanMutate,
  verifyAdminWithLanguages,
  ensureAdminMutateAuth,
  errorResponse,
  unauthorizedResponse,
  viewerReadonlyResponse,
  badRequest,
  notFound,
  forbiddenResponse,
} from '@/lib/sync-helpers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ensureTmdbApiKey', () => {
  it('returns ok:true when key exists', () => {
    const original = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'test-key-123';

    const result = ensureTmdbApiKey();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.apiKey).toBe('test-key-123');
    }

    process.env.TMDB_API_KEY = original;
  });

  it('returns ok:false when key is missing', () => {
    const original = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;

    const result = ensureTmdbApiKey();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response).toEqual(expect.objectContaining({ status: 503 }));
    }

    process.env.TMDB_API_KEY = original;
  });
});

describe('verifyBearer', () => {
  it('returns null for missing auth header', async () => {
    const result = await verifyBearer(null);
    expect(result).toBeNull();
  });

  it('returns null for non-Bearer header', async () => {
    const result = await verifyBearer('Basic abc123');
    expect(result).toBeNull();
  });

  it('returns user when token is valid', async () => {
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const result = await verifyBearer('Bearer valid-token');
    expect(result).toEqual(fakeUser);
    expect(mockGetUser).toHaveBeenCalledWith('valid-token');
  });

  it('returns null when supabase returns error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid' },
    });

    const result = await verifyBearer('Bearer bad-token');
    expect(result).toBeNull();
  });
});

describe('verifyAdmin', () => {
  it('returns null when bearer verification fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdmin('Bearer bad');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns null when admin role is blocked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'blocked' }, error: null }),
        }),
      }),
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdmin('Bearer valid');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns null when admin_user_roles query has error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
        }),
      }),
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdmin('Bearer valid');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns user when admin role is valid', async () => {
    const fakeUser = { id: 'u1', email: 'admin@test.com' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdmin('Bearer valid');
    expect(result).toEqual(fakeUser);
  });
});

describe('verifyAdminWithRole', () => {
  it('returns null when bearer fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdminWithRole('Bearer bad');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns user and role on success', async () => {
    const fakeUser = { id: 'u2', email: 'sa@test.com' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'super_admin', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminWithRole('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'super_admin' });
  });
});

describe('verifyAdminCanMutate', () => {
  it('returns null when auth fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdminCanMutate('Bearer bad');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns viewer_readonly for viewer role', async () => {
    const fakeUser = { id: 'u3' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'viewer', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminCanMutate('Bearer valid');
    expect(result).toBe('viewer_readonly');
  });

  it('returns user and role for admin role', async () => {
    const fakeUser = { id: 'u4' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminCanMutate('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'admin' });
  });
});

describe('verifyAdminWithLanguages', () => {
  it('returns null when auth fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdminWithLanguages('Bearer bad');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns viewer_readonly for viewer role', async () => {
    const fakeUser = { id: 'u5' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'viewer', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toBe('viewer_readonly');
  });

  it('returns empty languageCodes for root role', async () => {
    const fakeUser = { id: 'u6' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'root', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'root', languageCodes: [] });
  });

  it('returns empty languageCodes for super_admin role', async () => {
    const fakeUser = { id: 'u7' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'super_admin', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'super_admin', languageCodes: [] });
  });

  it('fetches language codes for admin role', async () => {
    const fakeUser = { id: 'u8' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    let _callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ language_id: 'lang-1' }], error: null }),
          }),
        };
      }
      if (table === 'languages') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [{ code: 'te' }], error: null }),
          }),
        };
      }
      return {};
    });

    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'admin', languageCodes: ['te'] });
  });

  it('returns empty languageCodes for admin role with no language assignments', async () => {
    const fakeUser = { id: 'u9' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    });

    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'admin', languageCodes: [] });
  });

  it('returns empty languageCodes for ph_admin role', async () => {
    const fakeUser = { id: 'u10' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'ph_admin', status: 'active' }, error: null }),
        }),
      }),
    });
    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'ph_admin', languageCodes: [] });
  });
});

describe('errorResponse', () => {
  it('returns NextResponse with correct status and message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Something broke');

    const response = errorResponse('sync', err, 500);
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Something broke' },
        status: 500,
      }),
    );

    consoleSpy.mockRestore();
  });

  it('uses label as fallback message for non-Error objects', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = errorResponse('import', 'string error');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'import failed' },
        status: 500,
      }),
    );

    consoleSpy.mockRestore();
  });

  it('uses custom status code', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = errorResponse('validation', new Error('bad input'), 400);
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'bad input' },
        status: 400,
      }),
    );

    consoleSpy.mockRestore();
  });
});

describe('unauthorizedResponse', () => {
  it('returns 401 with Unauthorized message', () => {
    const response = unauthorizedResponse();
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Unauthorized' },
        status: 401,
      }),
    );
  });
});

describe('viewerReadonlyResponse', () => {
  it('returns 403 with viewer readonly message', () => {
    const response = viewerReadonlyResponse();
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Viewer role is read-only' },
        status: 403,
      }),
    );
  });
});

describe('badRequest', () => {
  it('returns 400 with the provided message', () => {
    const response = badRequest('Missing userId parameter');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Missing userId parameter' },
        status: 400,
      }),
    );
  });
});

describe('notFound', () => {
  it('returns 404 with the provided message', () => {
    const response = notFound('Target user not found');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Target user not found' },
        status: 404,
      }),
    );
  });
});

describe('forbiddenResponse', () => {
  it('returns 403 with the provided message', () => {
    const response = forbiddenResponse('Only super admins can assign languages');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Only super admins can assign languages' },
        status: 403,
      }),
    );
  });
});

describe('verifyAdmin - null adminRole', () => {
  it('returns null when admin_user_roles returns null data (no row)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdmin('Bearer valid');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('verifyAdminWithRole - blocked status', () => {
  it('returns null when admin role status is blocked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'blocked' }, error: null }),
        }),
      }),
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await verifyAdminWithRole('Bearer valid');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('verifyAdminWithLanguages - admin with null assignments data', () => {
  it('returns empty languageCodes when user_languages query returns null data', async () => {
    const fakeUser = { id: 'u-null-langs' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      return {};
    });

    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'admin', languageCodes: [] });
  });

  it('returns empty languageCodes when languages query returns null data', async () => {
    const fakeUser = { id: 'u-null-codes' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ language_id: 'lang-1' }], error: null }),
          }),
        };
      }
      if (table === 'languages') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      return {};
    });

    const result = await verifyAdminWithLanguages('Bearer valid');
    expect(result).toEqual({ user: fakeUser, role: 'admin', languageCodes: [] });
  });
});

describe('verifyBearer - null user', () => {
  it('returns null when getUser returns null user without error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await verifyBearer('Bearer valid-but-no-user');
    expect(result).toBeNull();
  });
});

describe('ensureAdminMutateAuth', () => {
  it('returns ok:true with auth and apiKey for admin user', async () => {
    const fakeUser = { id: 'u-admin' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    });

    const original = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'test-tmdb-key';

    const result = await ensureAdminMutateAuth('Bearer valid');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.user).toEqual(fakeUser);
      expect(result.apiKey).toBe('test-tmdb-key');
    }

    process.env.TMDB_API_KEY = original;
  });

  it('returns 403 for viewer role', async () => {
    const fakeUser = { id: 'u-viewer' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'viewer', status: 'active' }, error: null }),
        }),
      }),
    });

    const result = await ensureAdminMutateAuth('Bearer valid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns 401 when auth fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await ensureAdminMutateAuth('Bearer bad');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }

    consoleSpy.mockRestore();
  });

  it('returns 503 when TMDB API key is missing', async () => {
    const fakeUser = { id: 'u-admin' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    });

    const original = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;

    const result = await ensureAdminMutateAuth('Bearer valid');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }

    process.env.TMDB_API_KEY = original;
  });
});

describe('badRequest', () => {
  it('returns 400 with the provided message', () => {
    const response = badRequest('Missing userId parameter');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Missing userId parameter' },
        status: 400,
      }),
    );
  });
});

describe('notFound', () => {
  it('returns 404 with the provided message', () => {
    const response = notFound('Target user not found');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Target user not found' },
        status: 404,
      }),
    );
  });
});

describe('forbiddenResponse', () => {
  it('returns 403 with the provided message', () => {
    const response = forbiddenResponse('Only super admins can assign languages');
    expect(response).toEqual(
      expect.objectContaining({
        body: { error: 'Only super admins can assign languages' },
        status: 403,
      }),
    );
  });
});
