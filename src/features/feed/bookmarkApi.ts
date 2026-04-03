import { supabase } from '@/lib/supabase';
import type { NewsFeedItem } from '@shared/types';

// @sideeffect: upsert fires trg_feed_bookmark_count trigger on INSERT, incrementing news_feed.bookmark_count.
// @contract: onConflict 'feed_item_id,user_id' matches the UNIQUE constraint on feed_bookmarks.
// If the row already exists (already bookmarked), the upsert is a no-op — trigger does not re-fire.
export async function bookmarkFeedItem(feedItemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_bookmarks')
    .upsert({ feed_item_id: feedItemId, user_id: userId }, { onConflict: 'feed_item_id,user_id' });
  if (error) throw error;
}

// @sideeffect: delete fires trg_feed_bookmark_count trigger, decrementing news_feed.bookmark_count.
// If the row doesn't exist (not bookmarked), Supabase returns success with 0 affected rows — trigger
// does not fire, so counts stay correct. No error thrown for "nothing to delete".
export async function unbookmarkFeedItem(feedItemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_bookmarks')
    .delete()
    .eq('feed_item_id', feedItemId)
    .eq('user_id', userId);
  if (error) throw error;
}

// @contract: batches .in() calls in chunks of 40 to stay within URL length limits
// @edge: batches run in parallel via Promise.all for faster loading on long feeds
export async function fetchUserBookmarks(
  userId: string,
  feedItemIds: string[],
): Promise<Record<string, true>> {
  if (feedItemIds.length === 0) return {};

  const BATCH_SIZE = 40;
  const batches: string[][] = [];
  for (let i = 0; i < feedItemIds.length; i += BATCH_SIZE) {
    batches.push(feedItemIds.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from('feed_bookmarks')
        .select('feed_item_id')
        .eq('user_id', userId)
        .in('feed_item_id', batch);
      if (error) throw error;
      return data ?? [];
    }),
  );

  const bookmarked: Record<string, true> = {};
  for (const rows of results) {
    for (const row of rows) {
      bookmarked[row.feed_item_id as string] = true;
    }
  }
  return bookmarked;
}

// @boundary: queries feed_bookmarks with embedded news_feed relation, ordered by bookmark created_at DESC
// @assumes: FK name 'feed_bookmarks_feed_item_id_fkey' follows Supabase auto-naming convention ({table}_{column}_fkey)
// @nullable: if news_feed row was deleted (CASCADE), the bookmark row is also deleted — no orphans
export async function fetchBookmarkedFeed(
  userId: string,
  offset: number = 0,
  limit: number = 15,
): Promise<NewsFeedItem[]> {
  const { data, error } = await supabase
    .from('feed_bookmarks')
    .select(
      `created_at,
      news_feed:news_feed!feed_bookmarks_feed_item_id_fkey(
        *,
        movie:movies!news_feed_movie_id_fkey(id, title, poster_url, release_date)
      )`,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return ((data ?? []) as unknown as { news_feed: NewsFeedItem }[]).map((row) => row.news_feed);
}
