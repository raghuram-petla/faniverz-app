import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlatforms, useOttReleases, useMoviePlatformMap } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockPlatforms = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
  { id: 'aha', name: 'Aha', logo: '🎬', color: '#FF6B00', display_order: 2 },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('usePlatforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches platforms successfully', async () => {
    (api.fetchPlatforms as jest.Mock).mockResolvedValue(mockPlatforms);

    const { result } = renderHook(() => usePlatforms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlatforms);
  });

  it('uses 24hr staleTime', async () => {
    (api.fetchPlatforms as jest.Mock).mockResolvedValue(mockPlatforms);

    const { result } = renderHook(() => usePlatforms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Second call should use cache
    expect(api.fetchPlatforms).toHaveBeenCalledTimes(1);
  });
});

const mockOttReleases = [
  { id: 'mp1', movie_id: 'm1', platform: { id: 'netflix', name: 'Netflix' } },
  { id: 'mp2', movie_id: 'm1', platform: { id: 'aha', name: 'Aha' } },
];

describe('useOttReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches OTT releases for a movie', async () => {
    (api.fetchOttReleases as jest.Mock).mockResolvedValue(mockOttReleases);

    const { result } = renderHook(() => useOttReleases('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockOttReleases);
    expect(api.fetchOttReleases).toHaveBeenCalledWith('m1');
  });

  it('does not fetch when movieId is empty', async () => {
    const { result } = renderHook(() => useOttReleases(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchOttReleases).not.toHaveBeenCalled();
  });

  it('handles empty releases', async () => {
    (api.fetchOttReleases as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useOttReleases('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useMoviePlatformMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches platform map for movie IDs', async () => {
    const mockMap = {
      m1: [{ id: 'netflix', name: 'Netflix' }],
      m2: [{ id: 'aha', name: 'Aha' }],
    };
    (api.fetchMoviePlatformMap as jest.Mock).mockResolvedValue(mockMap);

    const { result } = renderHook(() => useMoviePlatformMap(['m1', 'm2']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMap);
    expect(api.fetchMoviePlatformMap).toHaveBeenCalledWith(['m1', 'm2']);
  });

  it('does not fetch when movieIds is empty', async () => {
    const { result } = renderHook(() => useMoviePlatformMap([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchMoviePlatformMap).not.toHaveBeenCalled();
  });

  it('handles empty map result', async () => {
    (api.fetchMoviePlatformMap as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useMoviePlatformMap(['m1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({});
  });
});
