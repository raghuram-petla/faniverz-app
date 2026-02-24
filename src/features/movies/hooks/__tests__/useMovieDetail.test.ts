import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMovieDetail } from '../useMovieDetail';
import * as api from '../../api';

jest.mock('../../api');

const mockMovie = {
  id: 'm1',
  title: 'Test Movie',
  director: 'Test Director',
  cast: [{ id: 'c1', actor: { name: 'Actor 1' } }],
  platforms: [{ id: 'p1', platform: { name: 'Netflix' } }],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useMovieDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movie detail by id', async () => {
    (api.fetchMovieById as jest.Mock).mockResolvedValue(mockMovie);

    const { result } = renderHook(() => useMovieDetail('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMovie);
    expect(api.fetchMovieById).toHaveBeenCalledWith('m1');
  });

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useMovieDetail(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchMovieById).not.toHaveBeenCalled();
  });

  it('handles null response', async () => {
    (api.fetchMovieById as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useMovieDetail('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('handles error state', async () => {
    (api.fetchMovieById as jest.Mock).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useMovieDetail('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
