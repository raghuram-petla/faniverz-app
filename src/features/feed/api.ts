import { supabase } from '@/lib/supabase';
import type { FeedFilterOption } from '@/types';
import type { NewsFeedItem, FeedVote } from '@shared/types';

const PAGE_SIZE = 15;

// @coupling: the movie join uses the explicit FK name 'news_feed_movie_id_fkey' — if this FK is renamed in a migration, Supabase returns data without the movie relation (silently null) rather than erroring. The same FK name is used in fetchFeaturedFeedItems and fetchFeedItemById below; all three must stay in sync.
// @nullable: movie_id on news_feed is nullable. When movie_id IS NULL, the join returns movie: null. The NewsFeedItem type declares movie as optional, so TypeScript won't catch UI code that assumes movie is always present.
// @edge: filter 'trailers' matches feed_type='video' AND content_type IN ('trailer','teaser','glimpse','promo') — but the personalized feed RPC (get_personalized_feed) has its OWN copy of this filter logic in SQL. Adding a new content_type to one but not the other causes different results between the two feeds.
export async function fetchNewsFeed(
  filter?: FeedFilterOption,
  page: number = 0,
  pageSize: number = PAGE_SIZE,
): Promise<NewsFeedItem[]> {
  let query = supabase
    .from('news_feed')
    .select('*, movie:movies!news_feed_movie_id_fkey(id, title, poster_url, release_date)')
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

// @boundary: calls Supabase RPC 'get_personalized_feed' — the function returns a flat row (no nested movie object). This function manually reconstructs the nested { movie: { id, title, poster_url, release_date } } shape to match NewsFeedItem. If the RPC adds new columns (e.g., movie_backdrop_url), they must be mapped here too or they're silently dropped.
// @assumes: the RPC returns movie_title as null for non-movie feed items. The ternary `row.movie_title ? { ... } : undefined` means feed items without a movie get movie=undefined, matching the fetchNewsFeed behavior. But if movie_title is empty string (not null), it would create a movie object with empty title.
// @sideeffect: the `as Record<string, unknown>[]` cast discards all Supabase type inference. If the RPC return type changes (e.g., column renamed from 'score' to 'rank_score'), the cast hides the mismatch and the field silently becomes undefined.
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
    view_count: row.view_count as number,
    comment_count: row.comment_count as number,
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

export async function fetchFeedItemById(id: string): Promise<NewsFeedItem | null> {
  const { data, error } = await supabase
    .from('news_feed')
    .select('*, movie:movies!news_feed_movie_id_fkey(id, title, poster_url, release_date)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as unknown as NewsFeedItem;
}

// @sideeffect: the upsert fires a DB trigger (trg_feed_vote_count) that handles both INSERT and UPDATE cases. On INSERT: increments the new vote_type count. On UPDATE (vote change): decrements old vote_type and increments new. The trigger handles the count math — the client's optimistic update in useVoteFeedItem must mirror this logic exactly or counts will flicker.
// @contract: onConflict 'feed_item_id,user_id' matches the UNIQUE constraint on feed_votes table. If this constraint is dropped/renamed, the upsert silently becomes a plain insert, allowing duplicate votes and double-counting via the trigger.
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

// @sideeffect: delete fires the same trg_feed_vote_count trigger which decrements the appropriate count on news_feed. If the row doesn't exist (already deleted), Supabase returns success with 0 affected rows — the trigger doesn't fire, so counts stay correct. No error is thrown for "nothing to delete".
export async function removeFeedVote(feedItemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_votes')
    .delete()
    .eq('feed_item_id', feedItemId)
    .eq('user_id', userId);

  if (error) throw error;
}

// @edge: Supabase .in() filter has an implicit URL length limit (~2000 chars). With UUID feed_item_ids (36 chars each), this breaks around ~50 IDs. If a user scrolls through many pages and collects 50+ visible feed item IDs, the query silently truncates or fails. Currently PAGE_SIZE=15 so this is safe for 3 pages, but batching is not implemented.
// @assumes: vote_type column is constrained to 'up'|'down' via CHECK in DB, so the cast to 'up' | 'down' is safe. If the constraint is relaxed to allow other values, the cast hides them from TypeScript.
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
