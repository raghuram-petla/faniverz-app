jest.mock('../../api', () => ({
  fetchUpcomingMovies: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpcomingMovies } from '../useUpcomingMovies';
import { fetchUpcomingMovies } from '../../api';

const mockFetch = fetchUpcomingMovies as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUpcomingMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fetchUpcomingMovies with page 0 initially', async () => {
    mockFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(0, 10);
  });

  it('returns movies from the first page', async () => {
    const movies = [
      { id: '1', title: 'Movie A', release_date: '2025-06-01' },
      { id: '2', title: 'Movie B', release_date: '2025-06-15' },
    ];
    mockFetch.mockResolvedValue(movies);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]).toEqual(movies);
  });

  it('has no next page when fewer than PAGE_SIZE results returned', async () => {
    mockFetch.mockResolvedValue([{ id: '1', title: 'Only One' }]);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('has next page when exactly PAGE_SIZE results returned', async () => {
    const fullPage = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      title: `Movie ${i}`,
    }));
    mockFetch.mockResolvedValue(fullPage);

    const { result } = renderHook(() => useUpcomingMovies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
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
