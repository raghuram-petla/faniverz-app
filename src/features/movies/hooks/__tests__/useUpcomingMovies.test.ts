jest.mock('../../api', () => ({
  fetchUpcomingMovies: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useUpcomingMovies } from '../useUpcomingMovies';
import { fetchUpcomingMovies } from '../../api';

const mockFetch = fetchUpcomingMovies as jest.Mock;

describe('useUpcomingMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fetchUpcomingMovies with offset 0 and initialPageSize initially', async () => {
    mockFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(0, 5);
  });

  it('returns movies from the first page via allItems', async () => {
    const movies = [
      { id: '1', title: 'Movie A', release_date: '2025-06-01' },
      { id: '2', title: 'Movie B', release_date: '2025-06-15' },
    ];
    mockFetch.mockResolvedValue(movies);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.allItems).toEqual(movies);
  });

  it('has no next page when fewer than initialPageSize results returned', async () => {
    mockFetch.mockResolvedValue([{ id: '1', title: 'Only One' }]);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('has next page when exactly expandedPageSize results returned on background expand', async () => {
    // First call (initialPageSize=5): return 5 items → triggers background expand
    const initialPage = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      title: `Movie ${i}`,
    }));
    // Second call (expandedPageSize=10): return 10 items → hasNextPage = true
    const expandedPage = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 5),
      title: `Movie ${i + 5}`,
    }));
    mockFetch.mockResolvedValueOnce(initialPage).mockResolvedValueOnce(expandedPage);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Network error');
  });
});
