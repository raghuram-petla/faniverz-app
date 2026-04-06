import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { STALE_5M } from '@/constants/queryConfig';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { fetchEditorialReview, upsertPollVote, removePollVote, upsertCraftRating } from './api';
import type { EditorialReviewWithUserData, CraftName } from '@shared/types';

const EDITORIAL_KEY = 'editorial-review';

// @boundary fetches editorial review for a movie, includes user's poll vote + craft ratings
export function useEditorialReview(movieId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [EDITORIAL_KEY, movieId, user?.id],
    queryFn: () => fetchEditorialReview(movieId, user?.id),
    enabled: !!movieId,
    staleTime: STALE_5M,
  });
}

// @sideeffect optimistic mutation for agree/disagree poll voting
// @contract toggles: same vote removes it, different vote switches it
export function usePollVoteMutation(movieId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      editorialReviewId,
      vote,
      previousVote,
    }: {
      editorialReviewId: string;
      vote: 'agree' | 'disagree';
      previousVote?: 'agree' | 'disagree' | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // @contract previousVote is captured before onMutate modifies cache
      if (previousVote === vote) {
        // Same vote — remove it
        await removePollVote(editorialReviewId, user.id);
      } else {
        // New or switched vote
        await upsertPollVote(editorialReviewId, user.id, vote);
      }
    },
    onMutate: async ({ vote }) => {
      if (!user) return;
      const key = [EDITORIAL_KEY, movieId, user.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EditorialReviewWithUserData | null>(key);
      if (!previous) return { previous };

      const currentVote = previous.user_poll_vote;
      let { agree_count, disagree_count } = previous;

      // @edge handle all toggle cases: same vote removes, different vote switches
      if (currentVote === vote) {
        // Removing vote
        if (vote === 'agree') agree_count = Math.max(0, agree_count - 1);
        else disagree_count = Math.max(0, disagree_count - 1);
        queryClient.setQueryData(key, {
          ...previous,
          user_poll_vote: null,
          agree_count,
          disagree_count,
        });
      } else {
        // Adding or switching
        if (currentVote === 'agree') agree_count = Math.max(0, agree_count - 1);
        if (currentVote === 'disagree') disagree_count = Math.max(0, disagree_count - 1);
        if (vote === 'agree') agree_count++;
        else disagree_count++;
        queryClient.setQueryData(key, {
          ...previous,
          user_poll_vote: vote,
          agree_count,
          disagree_count,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined && user) {
        queryClient.setQueryData([EDITORIAL_KEY, movieId, user.id], context.previous);
      }
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    },
    onSettled: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: [EDITORIAL_KEY, movieId, user.id] });
      }
    },
  });
}

// @sideeffect mutation for upserting individual craft ratings
// @contract updates one craft at a time, optimistically updates cache
export function useCraftRatingMutation(movieId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ craft, rating }: { craft: CraftName; rating: number }) => {
      if (!user) throw new Error('Not authenticated');
      await upsertCraftRating(movieId, user.id, craft, rating);
    },
    onMutate: async ({ craft, rating }) => {
      if (!user) return;
      const key = [EDITORIAL_KEY, movieId, user.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EditorialReviewWithUserData | null>(key);
      if (!previous) return { previous };

      const userKey = `user_craft_rating_${craft}` as keyof EditorialReviewWithUserData;
      queryClient.setQueryData(key, { ...previous, [userKey]: rating });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined && user) {
        queryClient.setQueryData([EDITORIAL_KEY, movieId, user.id], context.previous);
      }
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    },
    onSettled: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: [EDITORIAL_KEY, movieId, user.id] });
      }
    },
  });
}
