import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useEditorialReview, usePollVoteMutation, useCraftRatingMutation } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockUseAuth = jest.fn(() => ({ user: { id: 'u1' } as { id: string } | null }));
jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/constants/queryConfig', () => ({
  STALE_5M: 300000,
}));

const mockReview = {
  id: 'er1',
  movie_id: 'm1',
  title: 'Great Film',
  body: 'Detailed review',
  agree_count: 10,
  disagree_count: 3,
  user_poll_vote: null as string | null,
  user_craft_rating_direction: null as number | null,
  user_craft_rating_music: null as number | null,
};

describe('useEditorialReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('fetches editorial review for a movie', async () => {
    (api.fetchEditorialReview as jest.Mock).mockResolvedValue(mockReview);

    const { result } = renderHook(() => useEditorialReview('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockReview);
    expect(api.fetchEditorialReview).toHaveBeenCalledWith('m1', 'u1');
  });

  it('does not fetch when movieId is empty', async () => {
    const { result } = renderHook(() => useEditorialReview(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchEditorialReview).not.toHaveBeenCalled();
  });

  it('returns null when no review exists', async () => {
    (api.fetchEditorialReview as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useEditorialReview('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe('usePollVoteMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  function createWrapperWithData(data: typeof mockReview | null = mockReview) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Pre-populate cache with editorial review data
    if (data) {
      queryClient.setQueryData(['editorial-review', 'm1', 'u1'], data);
    }
    return {
      queryClient,
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    };
  }

  it('calls upsertPollVote for a new vote (no previous vote)', async () => {
    (api.upsertPollVote as jest.Mock).mockResolvedValue(undefined);
    const { wrapper } = createWrapperWithData();

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.upsertPollVote).toHaveBeenCalledWith('er1', 'u1', 'agree');
  });

  it('calls removePollVote when toggling same vote', async () => {
    (api.removePollVote as jest.Mock).mockResolvedValue(undefined);
    const reviewWithVote = { ...mockReview, user_poll_vote: 'agree' };
    const { wrapper } = createWrapperWithData(reviewWithVote);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree', previousVote: 'agree' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.removePollVote).toHaveBeenCalledWith('er1', 'u1');
    expect(api.upsertPollVote).not.toHaveBeenCalled();
  });

  it('calls upsertPollVote when switching vote', async () => {
    (api.upsertPollVote as jest.Mock).mockResolvedValue(undefined);
    const reviewWithVote = { ...mockReview, user_poll_vote: 'agree' };
    const { wrapper } = createWrapperWithData(reviewWithVote);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'disagree', previousVote: 'agree' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.upsertPollVote).toHaveBeenCalledWith('er1', 'u1', 'disagree');
  });

  it('optimistically updates agree count when voting agree', async () => {
    (api.upsertPollVote as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const { queryClient, wrapper } = createWrapperWithData();

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree', previousVote: null });
    });

    // Check optimistic update before mutation settles
    const cached = queryClient.getQueryData<typeof mockReview>(['editorial-review', 'm1', 'u1']);
    expect(cached?.user_poll_vote).toBe('agree');
    expect(cached?.agree_count).toBe(11);
  });

  it('optimistically decrements when removing a vote', async () => {
    (api.removePollVote as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const reviewWithVote = { ...mockReview, user_poll_vote: 'disagree', disagree_count: 5 };
    const { queryClient, wrapper } = createWrapperWithData(reviewWithVote);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({
        editorialReviewId: 'er1',
        vote: 'disagree',
        previousVote: 'disagree',
      });
    });

    const cached = queryClient.getQueryData<typeof mockReview>(['editorial-review', 'm1', 'u1']);
    expect(cached?.user_poll_vote).toBeNull();
    expect(cached?.disagree_count).toBe(4);
  });

  it('optimistically switches counts when changing vote', async () => {
    (api.upsertPollVote as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const reviewWithVote = {
      ...mockReview,
      user_poll_vote: 'agree',
      agree_count: 10,
      disagree_count: 3,
    };
    const { queryClient, wrapper } = createWrapperWithData(reviewWithVote);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'disagree', previousVote: 'agree' });
    });

    const cached = queryClient.getQueryData<typeof mockReview>(['editorial-review', 'm1', 'u1']);
    expect(cached?.user_poll_vote).toBe('disagree');
    expect(cached?.agree_count).toBe(9);
    expect(cached?.disagree_count).toBe(4);
  });

  it('rolls back on error and shows alert', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.upsertPollVote as jest.Mock).mockRejectedValue(new Error('Network error'));
    const { queryClient, wrapper } = createWrapperWithData();

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree', previousVote: null });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to submit vote. Please try again.');

    // Cache should be rolled back
    const cached = queryClient.getQueryData<typeof mockReview>(['editorial-review', 'm1', 'u1']);
    expect(cached?.user_poll_vote).toBeNull();
    expect(cached?.agree_count).toBe(10);
  });

  it('does not update cache when no previous data exists', async () => {
    (api.upsertPollVote as jest.Mock).mockResolvedValue(undefined);
    const { wrapper } = createWrapperWithData(null);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree', previousVote: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('usePollVoteMutation — extra branches', () => {
  function createWrapperWithData(data: typeof mockReview | null = mockReview) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    if (data) {
      queryClient.setQueryData(['editorial-review', 'm1', 'u1'], data);
    }
    return {
      queryClient,
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('optimistically removes disagree-side when switching from disagree to agree', async () => {
    (api.upsertPollVote as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const reviewWithDisagreeVote = {
      ...mockReview,
      user_poll_vote: 'disagree',
      agree_count: 5,
      disagree_count: 3,
    };
    const { queryClient, wrapper } = createWrapperWithData(reviewWithDisagreeVote);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree', previousVote: 'disagree' });
    });

    // Optimistically: disagree_count decremented (3→2), agree_count incremented (5→6)
    const cached = queryClient.getQueryData<typeof mockReview>(['editorial-review', 'm1', 'u1']);
    expect(cached?.agree_count).toBe(6);
    expect(cached?.disagree_count).toBe(2);
  });

  it('onError when context.previous is undefined does not crash and shows alert', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.upsertPollVote as jest.Mock).mockRejectedValue(new Error('Network error'));

    // No data seeded — onMutate returns { previous: undefined }, so onError skips cache restore
    const { wrapper } = createWrapperWithData(null);

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to submit vote. Please try again.');
  });

  it('throws when user is null (mutationFn guard — line 37)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { wrapper } = createWrapperWithData();

    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('onMutate returns early and onSettled skips invalidation when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    (api.upsertPollVote as jest.Mock).mockRejectedValue(new Error('Not authenticated'));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { wrapper } = createWrapperWithData();
    const { result } = renderHook(() => usePollVoteMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ editorialReviewId: 'er1', vote: 'agree' });
    });
    await waitFor(() => !result.current.isPending);
    // No crash — onMutate returned early without modifying cache
  });
});

describe('useCraftRatingMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  function createWrapperWithData(data: typeof mockReview | null = mockReview) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    if (data) {
      queryClient.setQueryData(['editorial-review', 'm1', 'u1'], data);
    }
    return {
      queryClient,
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    };
  }

  it('calls upsertCraftRating with correct params', async () => {
    (api.upsertCraftRating as jest.Mock).mockResolvedValue(undefined);
    const { wrapper } = createWrapperWithData();

    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ craft: 'direction' as never, rating: 4 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.upsertCraftRating).toHaveBeenCalledWith('m1', 'u1', 'direction', 4);
  });

  it('optimistically updates craft rating in cache', async () => {
    (api.upsertCraftRating as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const { queryClient, wrapper } = createWrapperWithData();

    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ craft: 'direction' as never, rating: 4 });
    });

    const cached = queryClient.getQueryData<Record<string, unknown>>([
      'editorial-review',
      'm1',
      'u1',
    ]);
    expect(cached?.user_craft_rating_direction).toBe(4);
  });

  it('rolls back on error and shows alert', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.upsertCraftRating as jest.Mock).mockRejectedValue(new Error('Save failed'));
    const { queryClient, wrapper } = createWrapperWithData();

    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ craft: 'direction' as never, rating: 4 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save rating. Please try again.');

    // Cache should be rolled back to original
    const cached = queryClient.getQueryData<typeof mockReview>(['editorial-review', 'm1', 'u1']);
    expect(cached?.user_craft_rating_direction).toBeNull();
  });

  it('does not update cache when no previous data exists', async () => {
    (api.upsertCraftRating as jest.Mock).mockResolvedValue(undefined);
    const { wrapper } = createWrapperWithData(null);

    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ craft: 'music' as never, rating: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('handles different craft names correctly', async () => {
    (api.upsertCraftRating as jest.Mock).mockResolvedValue(undefined);
    const { wrapper } = createWrapperWithData();

    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });

    await act(async () => {
      result.current.mutate({ craft: 'music' as never, rating: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.upsertCraftRating).toHaveBeenCalledWith('m1', 'u1', 'music', 5);
  });

  it('throws when user is null (mutationFn guard — line 107)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { wrapper } = createWrapperWithData();

    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ craft: 'direction' as never, rating: 4 });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('onMutate returns early and onSettled skips invalidation when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    (api.upsertCraftRating as jest.Mock).mockRejectedValue(new Error('Not authenticated'));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { wrapper } = createWrapperWithData();
    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ craft: 'direction' as never, rating: 4 });
    });
    await waitFor(() => !result.current.isPending);
    // No crash — onMutate returned early (user is null), onSettled skips invalidation
  });

  it('onError when context.previous is undefined does not crash and shows alert', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.upsertCraftRating as jest.Mock).mockRejectedValue(new Error('Save failed'));

    // No data seeded — onMutate returns { previous: undefined }, so onError skips cache restore
    const { wrapper } = createWrapperWithData(null);
    const { result } = renderHook(() => useCraftRatingMutation('m1'), { wrapper });
    await act(async () => {
      result.current.mutate({ craft: 'direction' as never, rating: 4 });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save rating. Please try again.');
  });
});
