import { supabase } from '@/lib/supabase';

export type ActivityActionType = 'vote' | 'follow' | 'unfollow' | 'comment' | 'review';
export type ActivityEntityType = 'movie' | 'actor' | 'production_house' | 'feed_item' | 'comment';
export type ActivityFilter = 'all' | 'votes' | 'follows' | 'comments';

export interface UserActivity {
  id: string;
  user_id: string;
  action_type: ActivityActionType;
  entity_type: ActivityEntityType;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const PAGE_SIZE = 20;

const FILTER_MAP: Record<ActivityFilter, ActivityActionType[]> = {
  all: [],
  votes: ['vote'],
  follows: ['follow', 'unfollow'],
  comments: ['comment'],
};

export async function fetchUserActivity(
  userId: string,
  filter: ActivityFilter = 'all',
  page: number = 0,
): Promise<UserActivity[]> {
  let query = supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const actionTypes = FILTER_MAP[filter];
  if (actionTypes.length > 0) {
    query = query.in('action_type', actionTypes);
  }

  const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return data ?? [];
}
