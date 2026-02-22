import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyReview, useCreateReview, useDeleteReview } from '../hooks';
import { fetchMyReview, insertReview, deleteReview } from '../api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('../api');

const mockFetchMyReview = fetchMyReview as jest.MockedFunction<typeof fetchMyReview>;
const mockInsertReview = insertReview as jest.MockedFunction<typeof insertReview>;
const mockDeleteReview = deleteReview as jest.MockedFunction<typeof deleteReview>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe('Review Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMyReview', () => {
    it('fetches user review for a movie', async () => {
      const mockData = {
        id: 1,
        user_id: 'user-1',
        movie_id: 42,
        rating: 4,
        title: 'Great',
        body: 'Loved it',
        is_spoiler: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        profile: { display_name: 'User', avatar_url: null },
      };
      mockFetchMyReview.mockResolvedValue(mockData);

      const { result } = renderHook(() => useMyReview(42, 'user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });

    it('does not fetch when userId is undefined', () => {
      renderHook(() => useMyReview(42, undefined), {
        wrapper: createWrapper(),
      });
      expect(mockFetchMyReview).not.toHaveBeenCalled();
    });
  });

  describe('useCreateReview', () => {
    it('calls insertReview', async () => {
      const mockResult = {
        id: 1,
        user_id: 'user-1',
        movie_id: 42,
        rating: 4,
        title: null,
        body: null,
        is_spoiler: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      mockInsertReview.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCreateReview(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          userId: 'user-1',
          review: { movie_id: 42, rating: 4 },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInsertReview).toHaveBeenCalledWith('user-1', { movie_id: 42, rating: 4 });
    });
  });

  describe('useDeleteReview', () => {
    it('calls deleteReview', async () => {
      mockDeleteReview.mockResolvedValue();

      const { result } = renderHook(() => useDeleteReview(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ reviewId: 1, movieId: 42 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteReview).toHaveBeenCalledWith(1);
    });
  });
});
