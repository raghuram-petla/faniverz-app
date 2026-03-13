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

  return useInfiniteQuery<UserActivity[]>({
    queryKey: ['user-activity', userId, filter],
    queryFn: ({ pageParam }) => fetchUserActivity(userId ?? '', filter, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : (lastPageParam as number) + 1,
    enabled: !!userId,
  });
}
