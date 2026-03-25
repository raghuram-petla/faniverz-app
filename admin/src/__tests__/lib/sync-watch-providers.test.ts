/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAllWatchProviders = vi.fn();
const mockGetWatchRegions = vi.fn();

vi.mock('@/lib/tmdb', () => ({
  getAllWatchProviders: (...args: unknown[]) => mockGetAllWatchProviders(...args),
  getWatchRegions: (...args: unknown[]) => mockGetWatchRegions(...args),
}));

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: null });
  const insertFn = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: 'auto-plat-123' },
        error: null,
      }),
    }),
  });
  const selectFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      single: vi.fn().mockResolvedValue({ data: { regions: [] }, error: null }),
    }),
  });
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  return {
    from: vi.fn((_table: string) => ({
      select: selectFn,
      upsert: upsertFn,
      insert: insertFn,
      update: updateFn,
      ...overrides,
    })),
    _upsertFn: upsertFn,
    _insertFn: insertFn,
    _selectFn: selectFn,
    _updateFn: updateFn,
  };
}

describe('syncWatchProvidersMultiCountry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when TMDB returns no results', async () => {
    mockGetAllWatchProviders.mockResolvedValue({ results: {} });
    mockGetWatchRegions.mockResolvedValue({});

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    const count = await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    expect(count).toBe(0);
  });

  it('returns 0 when results is undefined', async () => {
    mockGetAllWatchProviders.mockResolvedValue({ results: undefined });
    mockGetWatchRegions.mockResolvedValue({});

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    const count = await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    expect(count).toBe(0);
  });

  it('processes flatrate providers for a country', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        IN: {
          flatrate: [
            {
              provider_id: 8,
              provider_name: 'Netflix',
              logo_path: '/netflix.png',
              display_priority: 1,
            },
          ],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ IN: 'India' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    const count = await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    expect(count).toBe(1);
    // Should have called from() for movie_platform_availability upsert
    expect(supabase.from).toHaveBeenCalledWith('movie_platform_availability');
  });

  it('auto-creates platform when not found in DB', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        US: {
          flatrate: [{ provider_id: 999, provider_name: 'NewStreaming', logo_path: '/new.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ US: 'United States' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    // Should call insert on platforms table
    expect(supabase.from).toHaveBeenCalledWith('platforms');
  });

  it('ensures country is created in countries table', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        JP: {
          rent: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ JP: 'Japan' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    // Should call from('countries') for upsert
    expect(supabase.from).toHaveBeenCalledWith('countries');
  });

  it('writes to legacy movie_platforms for IN flatrate', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        IN: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ IN: 'India' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    expect(supabase.from).toHaveBeenCalledWith('movie_platforms');
  });

  it('does not write to legacy movie_platforms for non-IN countries', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        US: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ US: 'United States' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();
    await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    const moviePlatformsCalls = supabase.from.mock.calls.filter(
      (c: unknown[]) => c[0] === 'movie_platforms',
    );
    expect(moviePlatformsCalls).toHaveLength(0);
  });

  it('skips providers when platform resolution fails', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        IN: {
          flatrate: [{ provider_id: 999, provider_name: 'BadPlatform', logo_path: '/bad.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ IN: 'India' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    // Override insert to fail
    const supabase = makeSupabaseMock();
    supabase.from.mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              single: vi.fn().mockResolvedValue({ data: { regions: [] }, error: null }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            single: vi.fn().mockResolvedValue({ data: { regions: [] }, error: null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'auto-plat' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    const count = await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    expect(count).toBe(0);
  });

  it('processes multiple availability types', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        IN: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
          rent: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
          buy: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ IN: 'India' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const supabase = makeSupabaseMock();

    // Simulate existing platform
    supabase.from.mockImplementation((_table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'netflix-8' } }),
          single: vi.fn().mockResolvedValue({ data: { regions: ['IN'] }, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'auto-plat' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }));

    const count = await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    expect(count).toBe(3);
  });

  it('caches platform IDs to avoid repeated lookups', async () => {
    mockGetAllWatchProviders.mockResolvedValue({
      results: {
        IN: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
        },
        US: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
        },
      },
    });
    mockGetWatchRegions.mockResolvedValue({ IN: 'India', US: 'United States' });

    const { syncWatchProvidersMultiCountry } = await import('@/lib/sync-watch-providers');
    const selectEqMock = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'netflix-8' } }),
      single: vi.fn().mockResolvedValue({ data: { regions: [] }, error: null }),
    });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: selectEqMock,
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })),
    };

    await syncWatchProvidersMultiCountry('m1', 12345, 'api-key', supabase as any);
    // Platform lookup should only happen once (cached for second country)
    const platformLookups = selectEqMock.mock.calls.filter(
      (_: unknown, i: number) => selectEqMock.mock.calls[i]?.[0] === 'tmdb_provider_id',
    );
    // At most one lookup for provider_id 8
    expect(platformLookups.length).toBeLessThanOrEqual(1);
  });
});
