import { supabase } from '@/lib/supabase';
import type { FeedFilterOption } from '@/types';
import type { NewsFeedItem } from '@shared/types';

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
