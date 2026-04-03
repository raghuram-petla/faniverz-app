import { useAuth } from '@/features/auth/providers/AuthProvider';
import { ACTIVITY_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { fetchUserActivity, type ActivityFilter, type UserActivity } from './activityApi';

// @contract: Uses smart pagination — loads 5 items initially, background-expands to 20 more.
export function useUserActivity(filter: ActivityFilter = 'all') {
  const { user } = useAuth();
  const userId = user?.id;

  // @edge: queryKey includes filter, so switching filters creates a separate cache entry. Going from 'all' to 'votes'
  // and back shows cached 'all' data instantly (good UX), but the 'all' cache doesn't invalidate when a vote mutation
  // only invalidates ['user-activity', userId, 'votes']. A vote action will appear stale under the 'all' tab until
  // its staleTime expires or a full refetch.
  return useSmartInfiniteQuery<UserActivity>({
    queryKey: ['user-activity', userId, filter],
    queryFn: (offset, limit) =>
      fetchUserActivity(
        userId ?? /* istanbul ignore next -- queryFn never runs when enabled is false */ '',
        filter,
        offset,
        limit,
      ),
    config: ACTIVITY_PAGINATION,
    enabled: !!userId,
  });
}
