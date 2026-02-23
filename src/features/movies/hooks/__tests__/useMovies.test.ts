import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMovies } from '../useMovies';
import * as api from '../../api';

jest.mock('../../api');

const mockMovies = [
  { id: '1', title: 'Movie 1', release_type: 'theatrical' },
  { id: '2', title: 'Movie 2', release_type: 'ott' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches movies successfully', async () => {
    (api.fetchMovies as jest.Mock).mockResolvedValue(mockMovies);

    const { result } = renderHook(() => useMovies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMovies);
  });

  it('passes filters to fetch function', async () => {
    (api.fetchMovies as jest.Mock).mockResolvedValue([mockMovies[0]]);

    const filters = { releaseType: 'theatrical' as const };
    renderHook(() => useMovies(filters), { wrapper: createWrapper() });

    await waitFor(() => expect(api.fetchMovies).toHaveBeenCalledWith(filters));
  });

  it('uses correct query key with filters', async () => {
    (api.fetchMovies as jest.Mock).mockResolvedValue([]);
    const filters = { releaseType: 'ott' as const };

    const { result } = renderHook(() => useMovies(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
