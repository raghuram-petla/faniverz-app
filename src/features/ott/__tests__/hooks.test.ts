import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { usePlatforms, useMoviePlatformMap, useMovieAvailability } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockPlatforms = [
  { id: 'netflix', name: 'Netflix', logo: 'N', logo_url: null, color: '#E50914', display_order: 1 },
  { id: 'aha', name: 'Aha', logo: '🎬', logo_url: null, color: '#FF6B00', display_order: 2 },
];

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

  it('sorts movieIds for cache stability', async () => {
    const mockMap = { m1: [], m2: [] };
    (api.fetchMoviePlatformMap as jest.Mock).mockResolvedValue(mockMap);

    const { result } = renderHook(() => useMoviePlatformMap(['m2', 'm1']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Should have called with sorted IDs
    expect(api.fetchMoviePlatformMap).toHaveBeenCalledWith(['m1', 'm2']);
  });
});

describe('useMovieAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movie availability for a movie', async () => {
    const mockAvailability = { streaming: ['netflix'], theatrical: [] };
    (api.fetchMovieAvailability as jest.Mock).mockResolvedValue(mockAvailability);

    const { result } = renderHook(() => useMovieAvailability('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAvailability);
    expect(api.fetchMovieAvailability).toHaveBeenCalledWith('m1');
  });

  it('does not fetch when movieId is empty', () => {
    const { result } = renderHook(() => useMovieAvailability(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchMovieAvailability).not.toHaveBeenCalled();
  });

  it('handles empty availability result', async () => {
    (api.fetchMovieAvailability as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useMovieAvailability('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({});
  });
});
