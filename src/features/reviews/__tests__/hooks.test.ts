import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMovieReviews, useUserReviews, useReviewMutations } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockMovieReviews = [
  { id: 'r1', movie_id: 'm1', user_id: 'u1', rating: 4, content: 'Great movie' },
  { id: 'r2', movie_id: 'm1', user_id: 'u2', rating: 5, content: 'Excellent' },
];

const mockUserReviews = [
  { id: 'r1', movie_id: 'm1', user_id: 'u1', rating: 4, movie: { title: 'Movie 1' } },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useMovieReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches reviews for a movie', async () => {
    (api.fetchMovieReviews as jest.Mock).mockResolvedValue(mockMovieReviews);

    const { result } = renderHook(() => useMovieReviews('m1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMovieReviews);
    expect(api.fetchMovieReviews).toHaveBeenCalledWith('m1');
  });

  it('does not fetch when movieId is empty', async () => {
    const { result } = renderHook(() => useMovieReviews(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchMovieReviews).not.toHaveBeenCalled();
  });
});

describe('useUserReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches reviews for a user', async () => {
    (api.fetchUserReviews as jest.Mock).mockResolvedValue(mockUserReviews);

    const { result } = renderHook(() => useUserReviews('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUserReviews);
    expect(api.fetchUserReviews).toHaveBeenCalledWith('u1');
  });

  it('does not fetch when userId is empty', async () => {
    const { result } = renderHook(() => useUserReviews(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchUserReviews).not.toHaveBeenCalled();
  });
});

describe('useReviewMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes create, update, remove, helpful mutations', () => {
    const { result } = renderHook(() => useReviewMutations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.create).toBeDefined();
    expect(result.current.update).toBeDefined();
    expect(result.current.remove).toBeDefined();
    expect(result.current.helpful).toBeDefined();
  });

  it('create mutation calls createReview', async () => {
    const input = { movie_id: 'm1', user_id: 'u1', rating: 4, content: 'Good' };
    const created = { id: 'r1', ...input };
    (api.createReview as jest.Mock).mockResolvedValue(created);

    const { result } = renderHook(() => useReviewMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.create.mutate(input as never);
    });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    expect(api.createReview).toHaveBeenCalledWith(input);
  });

  it('update mutation calls updateReview', async () => {
    const input = { rating: 5, content: 'Updated' };
    (api.updateReview as jest.Mock).mockResolvedValue({ id: 'r1', ...input });

    const { result } = renderHook(() => useReviewMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.update.mutate({ id: 'r1', input: input as never });
    });

    await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
    expect(api.updateReview).toHaveBeenCalledWith('r1', input);
  });

  it('remove mutation calls deleteReview', async () => {
    (api.deleteReview as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviewMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.remove.mutate('r1');
    });

    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    expect(api.deleteReview).toHaveBeenCalledWith('r1');
  });

  it('helpful mutation calls toggleHelpful', async () => {
    (api.toggleHelpful as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useReviewMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.helpful.mutate({ userId: 'u1', reviewId: 'r1' });
    });

    await waitFor(() => expect(result.current.helpful.isSuccess).toBe(true));
    expect(api.toggleHelpful).toHaveBeenCalledWith('u1', 'r1');
  });
});
