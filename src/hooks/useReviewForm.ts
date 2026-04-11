import { useState, useCallback } from 'react';
import type { CraftName } from '@shared/types';
import { useReviewMutations } from '@/features/reviews/hooks';
import { useCraftRatingMutation } from '@/features/editorial/hooks';

/**
 * @contract Manages review form state and submission for a single movie.
 * @sideeffect create.mutate triggers optimistic update + invalidates review cache.
 */
export function useReviewForm(movieId: string, userId: string) {
  const { create: createReview, helpful: helpfulMutation } = useReviewMutations();
  const craftRatingMutation = useCraftRatingMutation(movieId);

  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [containsSpoiler, setContainsSpoiler] = useState(false);
  const [craftRatings, setCraftRatings] = useState<Partial<Record<CraftName, number>>>({});

  /** @edge rating === 0 guard prevents submitting empty reviews */
  const submit = useCallback(() => {
    if (rating === 0) return;
    createReview.mutate({
      user_id: userId,
      movie_id: movieId,
      rating,
      title,
      body,
      contains_spoiler: containsSpoiler,
    });
    for (const [craft, r] of Object.entries(craftRatings)) {
      if (r) craftRatingMutation.mutate({ craft: craft as CraftName, rating: r });
    }
    setShowModal(false);
    setRating(0);
    setTitle('');
    setBody('');
    setContainsSpoiler(false);
    setCraftRatings({});
  }, [
    rating,
    title,
    body,
    containsSpoiler,
    craftRatings,
    movieId,
    userId,
    createReview,
    craftRatingMutation,
  ]);

  return {
    showModal,
    setShowModal,
    rating,
    setRating,
    title,
    setTitle,
    body,
    setBody,
    containsSpoiler,
    setContainsSpoiler,
    craftRatings,
    setCraftRatings,
    submit,
    helpfulMutation,
  };
}
