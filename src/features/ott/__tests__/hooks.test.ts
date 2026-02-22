import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOttReleases, usePlatforms } from '../hooks';
import { fetchOttReleases, fetchPlatforms } from '../api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('../api');

const mockFetchOttReleases = fetchOttReleases as jest.MockedFunction<typeof fetchOttReleases>;
const mockFetchPlatforms = fetchPlatforms as jest.MockedFunction<typeof fetchPlatforms>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe('OTT Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useOttReleases', () => {
    it('fetches OTT releases for a movie', async () => {
      const mockData = [
        {
          id: 1,
          movie_id: 42,
          platform_id: 1,
          ott_release_date: '2025-06-01',
          deep_link_url: null,
          is_exclusive: false,
          source: 'tmdb' as const,
          platform: {
            id: 1,
            name: 'Aha',
            slug: 'aha',
            logo_url: null,
            base_deep_link: null,
            color: '#FF0000',
            display_order: 1,
          },
        },
      ];
      mockFetchOttReleases.mockResolvedValue(mockData);

      const { result } = renderHook(() => useOttReleases(42), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(mockFetchOttReleases).toHaveBeenCalledWith(42);
    });

    it('does not fetch when movieId is 0', () => {
      mockFetchOttReleases.mockResolvedValue([]);

      renderHook(() => useOttReleases(0), {
        wrapper: createWrapper(),
      });

      expect(mockFetchOttReleases).not.toHaveBeenCalled();
    });
  });

  describe('usePlatforms', () => {
    it('fetches all platforms', async () => {
      const mockData = [
        {
          id: 1,
          name: 'Aha',
          slug: 'aha',
          logo_url: null,
          base_deep_link: null,
          color: '#FF0000',
          display_order: 1,
        },
      ];
      mockFetchPlatforms.mockResolvedValue(mockData);

      const { result } = renderHook(() => usePlatforms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });
  });
});
