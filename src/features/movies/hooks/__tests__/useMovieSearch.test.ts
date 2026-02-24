import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMovieSearch } from '../useMovieSearch';
import * as api from '../../api';

jest.mock('../../api');

jest.useFakeTimers();

const mockResults = [
  { id: 'm1', title: 'Pushpa 2', rating: 4.5 },
  { id: 'm2', title: 'Pushpa: The Rise', rating: 4.2 },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useMovieSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('searches movies after debounce with 2+ character query', async () => {
    (api.searchMovies as jest.Mock).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useMovieSearch('pu'), { wrapper: createWrapper() });

    // Advance past debounce timer
    jest.advanceTimersByTime(350);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResults);
    expect(api.searchMovies).toHaveBeenCalledWith('pu');
  });

  it('does not search when query is less than 2 characters', async () => {
    const { result } = renderHook(() => useMovieSearch('p'), { wrapper: createWrapper() });

    jest.advanceTimersByTime(350);

    // Should remain in idle/disabled state
    expect(result.current.isFetching).toBe(false);
    expect(api.searchMovies).not.toHaveBeenCalled();
  });

  it('does not search when query is empty', async () => {
    const { result } = renderHook(() => useMovieSearch(''), { wrapper: createWrapper() });

    jest.advanceTimersByTime(350);

    expect(result.current.isFetching).toBe(false);
    expect(api.searchMovies).not.toHaveBeenCalled();
  });

  it('debounces the search query', async () => {
    (api.searchMovies as jest.Mock).mockResolvedValue(mockResults);

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useMovieSearch(query),
      { wrapper: createWrapper(), initialProps: { query: 'pu' } },
    );

    // Advance partway, then change query
    jest.advanceTimersByTime(100);
    rerender({ query: 'push' });

    // Advance past debounce
    jest.advanceTimersByTime(350);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Should only search with the final debounced query
    expect(api.searchMovies).toHaveBeenCalledWith('push');
  });
});
