import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  fetchUserActivity,
  PAGE_SIZE,
  type ActivityFilter,
  type UserActivity,
} from './activityApi';

export function useUserActivity(filter: ActivityFilter = 'all') {
  const { user } = useAuth();
  const userId = user?.id;

  // @edge: queryKey includes filter, so switching filters creates a separate cache entry. Going from 'all' to 'votes'
  // and back shows cached 'all' data instantly (good UX), but the 'all' cache doesn't invalidate when a vote mutation
  // only invalidates ['user-activity', userId, 'votes']. A vote action will appear stale under the 'all' tab until
  // its staleTime expires or a full refetch.
  return useInfiniteQuery<UserActivity[]>({
    queryKey: ['user-activity', userId, filter],
    queryFn: ({ pageParam }) => fetchUserActivity(userId ?? '', filter, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : (lastPageParam as number) + 1,
    enabled: !!userId,
  });
}
