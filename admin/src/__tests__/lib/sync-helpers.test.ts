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

import { ensureTmdbApiKey, verifyBearer, errorResponse } from '@/lib/sync-helpers';

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
});
