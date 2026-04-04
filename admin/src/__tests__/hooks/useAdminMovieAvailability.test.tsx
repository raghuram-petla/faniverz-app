import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();
const mockAlert = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

const mockCrudFetch = vi.fn();
vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

// Mock window.alert
Object.defineProperty(window, 'alert', { value: mockAlert });

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useMovieAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches availability for a movie', async () => {
    const mockData = [
      {
        id: '1',
        movie_id: 'm1',
        platform_id: 'p1',
        country_code: 'IN',
        availability_type: 'flatrate',
      },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            }),
          }),
        }),
      }),
    });

    const { useMovieAvailability } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useMovieAvailability('m1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(mockData));
  });

  it('does not fetch when movieId is empty', async () => {
    const { useMovieAvailability } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useMovieAvailability(''), { wrapper });

    // Should not trigger a query — stays undefined
    expect(result.current.data).toBeUndefined();
  });
});

describe('useCountries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches countries sorted by display_order', async () => {
    const mockData = [
      { code: 'IN', name: 'India', display_order: 1 },
      { code: 'US', name: 'United States', display_order: 2 },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const { useCountries } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useCountries(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(mockData));
  });
});

describe('useAddMovieAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls crudFetch with POST and correct data', async () => {
    const newRow = {
      movie_id: 'm1',
      platform_id: 'p1',
      country_code: 'IN',
      availability_type: 'flatrate' as const,
    };
    mockCrudFetch.mockResolvedValue({ ...newRow, id: 'new-1' });

    const { useAddMovieAvailability } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useAddMovieAvailability(), { wrapper });

    result.current.mutate(newRow);

    await waitFor(() => {
      expect(mockCrudFetch).toHaveBeenCalledWith('POST', {
        table: 'movie_platform_availability',
        data: newRow,
      });
    });
  });

  it('shows alert on error', async () => {
    mockCrudFetch.mockRejectedValue(new Error('Insert failed'));

    const { useAddMovieAvailability } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useAddMovieAvailability(), { wrapper });

    result.current.mutate({
      movie_id: 'm1',
      platform_id: 'p1',
      country_code: 'IN',
      availability_type: 'flatrate',
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Insert failed');
    });
  });
});

describe('useRemoveMovieAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls crudFetch with DELETE', async () => {
    mockCrudFetch.mockResolvedValue(undefined);

    const { useRemoveMovieAvailability } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useRemoveMovieAvailability(), { wrapper });

    result.current.mutate({ id: 'avail-1', movie_id: 'm1' });

    await waitFor(() => {
      expect(mockCrudFetch).toHaveBeenCalledWith('DELETE', {
        table: 'movie_platform_availability',
        id: 'avail-1',
      });
    });
  });

  it('shows alert on remove error', async () => {
    mockCrudFetch.mockRejectedValue(new Error('Delete failed'));

    const { useRemoveMovieAvailability } = await import('@/hooks/useAdminMovieAvailability');
    const { result } = renderHook(() => useRemoveMovieAvailability(), { wrapper });

    result.current.mutate({ id: 'avail-1', movie_id: 'm1' });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Delete failed');
    });
  });
});
