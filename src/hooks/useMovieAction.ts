import { useCallback } from 'react';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie, MovieStatus } from '@shared/types';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useWatchlistSet, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useAuthGate } from '@/hooks/useAuthGate';

export type MovieActionType = 'follow' | 'watchlist';

export interface MovieActionResult {
  actionType: MovieActionType;
  isActive: boolean;
  onPress: () => void;
  iconName: string;
  iconNameActive: string;
  label: string;
  labelActive: string;
}

/** Pure utility — used by HeroCarousel where hooks can't be called inside renderItem. */
export function getMovieActionType(status: MovieStatus): MovieActionType {
  return status === 'streaming' ? 'watchlist' : 'follow';
}

export function useMovieAction(
  movie: Pick<Movie, 'id' | 'release_date' | 'in_theaters'>,
  platformCount: number,
): MovieActionResult {
  const status = deriveMovieStatus(movie, platformCount);
  const actionType = getMovieActionType(status);

  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { gate } = useAuthGate();

  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  const isFollowing = followSet.has(`movie:${movie.id}`);

  const { watchlistSet } = useWatchlistSet();
  const { add: addWatchlist, remove: removeWatchlist } = useWatchlistMutations();
  const isWatchlisted = watchlistSet.has(movie.id);

  const isActive = actionType === 'follow' ? isFollowing : isWatchlisted;

  const handlePress = useCallback(() => {
    gate(() => {
      if (actionType === 'follow') {
        if (isFollowing) {
          unfollowMutation.mutate({ entityType: 'movie', entityId: movie.id });
        } else {
          followMutation.mutate({ entityType: 'movie', entityId: movie.id });
        }
      } else {
        if (isWatchlisted) {
          removeWatchlist.mutate({ userId, movieId: movie.id });
        } else {
          addWatchlist.mutate({ userId, movieId: movie.id });
        }
      }
    })();
  }, [
    actionType,
    isFollowing,
    isWatchlisted,
    movie.id,
    userId,
    gate,
    followMutation,
    unfollowMutation,
    addWatchlist,
    removeWatchlist,
  ]);

  return {
    actionType,
    isActive,
    onPress: handlePress,
    iconName: actionType === 'follow' ? 'heart-outline' : 'bookmark-outline',
    iconNameActive: actionType === 'follow' ? 'heart' : 'bookmark',
    label: actionType === 'follow' ? 'Follow' : 'Save',
    labelActive: actionType === 'follow' ? 'Following' : 'Saved',
  };
}
