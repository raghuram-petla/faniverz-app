import { supabase } from '@/lib/supabase';
import type { FeedFilterOption } from '@/types';
import type { NewsFeedItem, FeedVote } from '@shared/types';

const PAGE_SIZE = 15;

export async function fetchNewsFeed(
  filter?: FeedFilterOption,
  page: number = 0,
  pageSize: number = PAGE_SIZE,
): Promise<NewsFeedItem[]> {
  let query = supabase
    .from('news_feed')
    .select('*, movie:movies!news_feed_movie_id_fkey(id, title, poster_url, release_date)')
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false });

  if (filter && filter !== 'all') {
    switch (filter) {
      case 'trailers':
        query = query
          .eq('feed_type', 'video')
          .in('content_type', ['trailer', 'teaser', 'glimpse', 'promo']);
        break;
      case 'songs':
        query = query.eq('content_type', 'song');
        break;
      case 'posters':
        query = query.eq('feed_type', 'poster');
        break;
      case 'bts':
        query = query.in('content_type', ['bts', 'interview', 'event', 'making']);
        break;
      case 'surprise':
        query = query.eq('feed_type', 'surprise');
        break;
      case 'updates':
        query = query.eq('feed_type', 'update');
        break;
    }
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as NewsFeedItem[]) ?? [];
}

export async function fetchFeaturedFeedItems(): Promise<NewsFeedItem[]> {
  const { data, error } = await supabase
    .from('news_feed')
    .select('*, movie:movies!news_feed_movie_id_fkey(id, title, poster_url, release_date)')
    .eq('is_featured', true)
    .order('display_order')
    .limit(5);

  if (error) throw error;
  return (data as unknown as NewsFeedItem[]) ?? [];
}

export async function fetchPersonalizedFeed(
  userId: string | null,
  filter: FeedFilterOption = 'all',
  page: number = 0,
  pageSize: number = PAGE_SIZE,
): Promise<NewsFeedItem[]> {
  const { data, error } = await supabase.rpc('get_personalized_feed', {
    p_user_id: userId,
    p_filter: filter,
    p_limit: pageSize,
    p_offset: page * pageSize,
  });

  if (error) throw error;

  // Map RPC flat result to NewsFeedItem shape with nested movie
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.id as string,
    feed_type: row.feed_type as NewsFeedItem['feed_type'],
    content_type: row.content_type as string,
    title: row.title as string,
    description: row.description as string | null,
    movie_id: row.movie_id as string | null,
    source_table: row.source_table as string | null,
    source_id: row.source_id as string | null,
    thumbnail_url: row.thumbnail_url as string | null,
    youtube_id: row.youtube_id as string | null,
    duration: row.duration as string | null,
    is_pinned: row.is_pinned as boolean,
    is_featured: row.is_featured as boolean,
    display_order: row.display_order as number,
    upvote_count: row.upvote_count as number,
    downvote_count: row.downvote_count as number,
    published_at: row.published_at as string,
    created_at: row.created_at as string,
    score: row.score as number,
    movie: row.movie_title
      ? {
          id: row.movie_id as string,
          title: row.movie_title as string,
          poster_url: row.movie_poster_url as string | null,
          release_date: row.movie_release_date as string | null,
        }
      : undefined,
  }));
}

export async function voteFeedItem(
  feedItemId: string,
  userId: string,
  voteType: 'up' | 'down',
): Promise<FeedVote> {
  const { data, error } = await supabase
    .from('feed_votes')
    .upsert(
      { feed_item_id: feedItemId, user_id: userId, vote_type: voteType },
      { onConflict: 'feed_item_id,user_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as FeedVote;
}

export async function removeFeedVote(feedItemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_votes')
    .delete()
    .eq('feed_item_id', feedItemId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function fetchUserVotes(
  userId: string,
  feedItemIds: string[],
): Promise<Record<string, 'up' | 'down'>> {
  if (feedItemIds.length === 0) return {};

  const { data, error } = await supabase
    .from('feed_votes')
    .select('feed_item_id, vote_type')
    .eq('user_id', userId)
    .in('feed_item_id', feedItemIds);

  if (error) throw error;

  const votes: Record<string, 'up' | 'down'> = {};
  for (const row of data ?? []) {
    votes[row.feed_item_id] = row.vote_type as 'up' | 'down';
  }
  return votes;
}
