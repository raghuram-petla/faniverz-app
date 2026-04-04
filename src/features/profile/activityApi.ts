import { supabase } from '@/lib/supabase';

// @edge: 'review' action_type exists in this union but is NOT covered by any ActivityFilter in FILTER_MAP below — review activities only appear under the 'all' filter tab, never under a dedicated tab.
type ActivityActionType = 'vote' | 'follow' | 'unfollow' | 'comment' | 'review';
type ActivityEntityType = 'movie' | 'actor' | 'production_house' | 'feed_item' | 'comment';
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

const PAGE_SIZE = 20;

// @coupling: FILTER_MAP must stay in sync with ActivityActionType union. If a new action_type (e.g., 'review')
// is added to the union but not added to a filter group here, those activities only appear under 'all' —
// there's no TypeScript enforcement that every action_type is covered by at least one filter.
const FILTER_MAP: Record<ActivityFilter, ActivityActionType[]> = {
  all: [],
  votes: ['vote'],
  follows: ['follow', 'unfollow'],
  comments: ['comment'],
};

// @boundary: user_activity table is populated by DB triggers (on vote, follow, comment actions) — this API only reads. If a trigger is disabled or fails, activities silently stop appearing. There's no backfill mechanism.
// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function fetchUserActivity(
  userId: string,
  filter: ActivityFilter = 'all',
  offset: number = 0,
  limit: number = PAGE_SIZE,
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

  const to = offset + limit - 1;
  const { data, error } = await query.range(offset, to);
  if (error) throw error;
  return data ?? [];
}
