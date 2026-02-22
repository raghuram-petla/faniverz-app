import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWatchlist, useWatchlistStatus, useToggleWatchlist } from '../hooks';
import { fetchWatchlist, isInWatchlist, addToWatchlist, removeFromWatchlist } from '../api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('../api');

const mockFetchWatchlist = fetchWatchlist as jest.MockedFunction<typeof fetchWatchlist>;
const mockIsInWatchlist = isInWatchlist as jest.MockedFunction<typeof isInWatchlist>;
const mockAddToWatchlist = addToWatchlist as jest.MockedFunction<typeof addToWatchlist>;
const mockRemoveFromWatchlist = removeFromWatchlist as jest.MockedFunction<
  typeof removeFromWatchlist
>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe('Watchlist Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useWatchlist', () => {
    it('fetches watchlist for a user', async () => {
      const mockData = [
        {
          id: 1,
          user_id: 'user-1',
          movie_id: 42,
          created_at: '2025-01-01',
          movie: { id: 42, title: 'Test Movie' },
        },
      ];
      mockFetchWatchlist.mockResolvedValue(mockData as never);

      const { result } = renderHook(() => useWatchlist('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(mockFetchWatchlist).toHaveBeenCalledWith('user-1');
    });

    it('does not fetch when userId is undefined', () => {
      renderHook(() => useWatchlist(undefined), {
        wrapper: createWrapper(),
      });

      expect(mockFetchWatchlist).not.toHaveBeenCalled();
    });
  });

  describe('useWatchlistStatus', () => {
    it('checks if movie is in watchlist', async () => {
      mockIsInWatchlist.mockResolvedValue(true);

      const { result } = renderHook(() => useWatchlistStatus('user-1', 42), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(true);
    });

    it('does not fetch when userId is undefined', () => {
      renderHook(() => useWatchlistStatus(undefined, 42), {
        wrapper: createWrapper(),
      });

      expect(mockIsInWatchlist).not.toHaveBeenCalled();
    });

    it('does not fetch when movieId is 0', () => {
      renderHook(() => useWatchlistStatus('user-1', 0), {
        wrapper: createWrapper(),
      });

      expect(mockIsInWatchlist).not.toHaveBeenCalled();
    });
  });

  describe('useToggleWatchlist', () => {
    it('calls addToWatchlist when not currently watchlisted', async () => {
      mockAddToWatchlist.mockResolvedValue();

      const { result } = renderHook(() => useToggleWatchlist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          userId: 'user-1',
          movieId: 42,
          isCurrentlyWatchlisted: false,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAddToWatchlist).toHaveBeenCalledWith('user-1', 42);
    });

    it('calls removeFromWatchlist when currently watchlisted', async () => {
      mockRemoveFromWatchlist.mockResolvedValue();

      const { result } = renderHook(() => useToggleWatchlist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          userId: 'user-1',
          movieId: 42,
          isCurrentlyWatchlisted: true,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('user-1', 42);
    });
  });
});
