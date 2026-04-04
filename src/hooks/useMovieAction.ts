import { useCallback } from 'react';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie, MovieStatus } from '@shared/types';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '@/features/feed';
import { useWatchlistSet, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useAuthGate } from '@/hooks/useAuthGate';

export type MovieActionType = 'follow' | 'watchlist';

interface MovieActionResult {
  actionType: MovieActionType;
  isActive: boolean;
  onPress: () => void;
  iconName: string;
  iconNameActive: string;
  label: string;
  labelActive: string;
}

// @contract pure function — streaming movies get watchlist action, all others get follow
/** Pure utility — used by HeroCarousel where hooks can't be called inside renderItem. */
export function getMovieActionType(status: MovieStatus): MovieActionType {
  return status === 'streaming' ? 'watchlist' : 'follow';
}

// @coupling deriveMovieStatus, useAuthGate, follow mutations, watchlist mutations
// @contract returns a unified action interface (icon, label, handler) based on derived movie status
export function useMovieAction(
  movie: Pick<Movie, 'id' | 'release_date' | 'in_theaters'>,
  platformCount: number,
): MovieActionResult {
  // @assumes deriveMovieStatus is pure and deterministic given the same movie + platformCount
  const status = deriveMovieStatus(movie, platformCount);
  const actionType = getMovieActionType(status);

  const { user } = useAuth();
  // @nullable userId falls back to empty string when logged out; gate() prevents mutations in that state
  const userId = user?.id ?? /* istanbul ignore next */ '';
  const { gate } = useAuthGate();

  const { followSet } = useEntityFollows();
  const followMutation = useFollowEntity();
  const unfollowMutation = useUnfollowEntity();
  // @assumes followSet keys use "movie:{id}" format — must stay in sync with follow mutation entityType
  const isFollowing = followSet.has(`movie:${movie.id}`);

  const { watchlistSet } = useWatchlistSet();
  const { add: addWatchlist, remove: removeWatchlist } = useWatchlistMutations();
  const isWatchlisted = watchlistSet.has(movie.id);

  const isActive = actionType === 'follow' ? isFollowing : isWatchlisted;

  // @boundary auth gate wraps the entire handler — unauthenticated users are redirected before any mutation fires
  // @sideeffect fires follow/unfollow or watchlist add/remove mutation; optimistic updates handled by TanStack Query
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
