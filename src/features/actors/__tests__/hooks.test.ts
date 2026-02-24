import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFavoriteActors, useSearchActors, useFavoriteActorMutations } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockFavorites = [
  { id: 'f1', user_id: 'u1', actor_id: 'a1', actor: { id: 'a1', name: 'Mahesh Babu' } },
  { id: 'f2', user_id: 'u1', actor_id: 'a2', actor: { id: 'a2', name: 'Prabhas' } },
];

const mockSearchResults = [
  { id: 'a1', name: 'Mahesh Babu' },
  { id: 'a3', name: 'Mahesh Manjrekar' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useFavoriteActors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches favorite actors for a user', async () => {
    (api.fetchFavoriteActors as jest.Mock).mockResolvedValue(mockFavorites);

    const { result } = renderHook(() => useFavoriteActors('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFavorites);
    expect(api.fetchFavoriteActors).toHaveBeenCalledWith('u1');
  });

  it('does not fetch when userId is empty', async () => {
    const { result } = renderHook(() => useFavoriteActors(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchFavoriteActors).not.toHaveBeenCalled();
  });
});

describe('useSearchActors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches actors when query is at least 2 characters', async () => {
    (api.searchActors as jest.Mock).mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useSearchActors('ma'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSearchResults);
    expect(api.searchActors).toHaveBeenCalledWith('ma');
  });

  it('does not fetch when query is less than 2 characters', async () => {
    const { result } = renderHook(() => useSearchActors('m'), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.searchActors).not.toHaveBeenCalled();
  });

  it('does not fetch when query is empty', async () => {
    const { result } = renderHook(() => useSearchActors(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.searchActors).not.toHaveBeenCalled();
  });
});

describe('useFavoriteActorMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes add and remove mutations', () => {
    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.add).toBeDefined();
    expect(result.current.remove).toBeDefined();
  });

  it('add mutation calls addFavoriteActor', async () => {
    (api.addFavoriteActor as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', actorId: 'a1' });
    });

    await waitFor(() => expect(result.current.add.isSuccess).toBe(true));
    expect(api.addFavoriteActor).toHaveBeenCalledWith('u1', 'a1');
  });

  it('remove mutation calls removeFavoriteActor', async () => {
    (api.removeFavoriteActor as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavoriteActorMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', actorId: 'a1' });
    });

    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    expect(api.removeFavoriteActor).toHaveBeenCalledWith('u1', 'a1');
  });
});
