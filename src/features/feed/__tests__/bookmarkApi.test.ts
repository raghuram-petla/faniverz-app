jest.mock('@/lib/supabase', () => {
  // fetchBookmarkedFeed chain: .select().eq().order().range()
  const mockBmRange = jest.fn();
  const mockBmOrder = jest.fn(() => ({ range: mockBmRange }));
  // fetchUserBookmarks chain: .select().eq().in()
  const mockBmIn = jest.fn();
  // shared: .select().eq() — returns both chains
  const mockBmSelectEq = jest.fn(() => ({ in: mockBmIn, order: mockBmOrder }));
  const mockBmSelect = jest.fn(() => ({ eq: mockBmSelectEq }));
  // unbookmarkFeedItem chain: .delete().eq().eq()
  const mockBmDeleteEq2 = jest.fn();
  const mockBmDeleteEq = jest.fn(() => ({ eq: mockBmDeleteEq2 }));
  const mockBmDelete = jest.fn(() => ({ eq: mockBmDeleteEq }));
  // bookmarkFeedItem chain: .upsert()
  const mockBmUpsert = jest.fn();

  const mockFrom = jest.fn(() => ({
    upsert: mockBmUpsert,
    delete: mockBmDelete,
    select: mockBmSelect,
  }));

  return {
    supabase: {
      from: mockFrom,
      __mocks: {
        mockFrom,
        mockBmUpsert,
        mockBmDelete,
        mockBmDeleteEq,
        mockBmDeleteEq2,
        mockBmSelect,
        mockBmSelectEq,
        mockBmIn,
        mockBmOrder,
        mockBmRange,
      },
    },
  };
});

import {
  bookmarkFeedItem,
  unbookmarkFeedItem,
  fetchUserBookmarks,
  fetchBookmarkedFeed,
} from '../bookmarkApi';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocks = (supabase as any).__mocks;

const mockNewsFeedItem = {
  id: 'item-1',
  feed_type: 'video',
  content_type: 'trailer',
  title: 'Test Trailer',
  description: null,
  movie_id: 'm1',
  source_table: 'movie_videos',
  source_id: 'v1',
  thumbnail_url: null,
  youtube_id: 'abc',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 100,
  comment_count: 2,
  bookmark_count: 3,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  movie: { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2024-03-01' },
};

describe('bookmarkFeedItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upserts to feed_bookmarks with correct params', async () => {
    mocks.mockBmUpsert.mockResolvedValue({ error: null });
    await bookmarkFeedItem('item-1', 'user-123');
    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_bookmarks');
    expect(mocks.mockBmUpsert).toHaveBeenCalledWith(
      { feed_item_id: 'item-1', user_id: 'user-123' },
      { onConflict: 'feed_item_id,user_id' },
    );
  });

  it('throws on supabase error', async () => {
    mocks.mockBmUpsert.mockResolvedValue({ error: new Error('DB error') });
    await expect(bookmarkFeedItem('item-1', 'user-123')).rejects.toThrow('DB error');
  });
});

describe('unbookmarkFeedItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes from feed_bookmarks with correct params', async () => {
    mocks.mockBmDeleteEq2.mockResolvedValue({ error: null });
    await unbookmarkFeedItem('item-1', 'user-123');
    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_bookmarks');
    expect(mocks.mockBmDeleteEq).toHaveBeenCalledWith('feed_item_id', 'item-1');
    expect(mocks.mockBmDeleteEq2).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('throws on supabase error', async () => {
    mocks.mockBmDeleteEq2.mockResolvedValue({ error: new Error('Delete failed') });
    await expect(unbookmarkFeedItem('item-1', 'user-123')).rejects.toThrow('Delete failed');
  });
});

describe('fetchUserBookmarks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty record when feedItemIds is empty', async () => {
    const result = await fetchUserBookmarks('user-123', []);
    expect(result).toEqual({});
    expect(mocks.mockFrom).not.toHaveBeenCalled();
  });

  it('returns record of bookmarked feed item IDs', async () => {
    mocks.mockBmIn.mockResolvedValue({
      data: [{ feed_item_id: 'item-1' }, { feed_item_id: 'item-3' }],
      error: null,
    });
    const result = await fetchUserBookmarks('user-123', ['item-1', 'item-2', 'item-3']);
    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_bookmarks');
    expect(mocks.mockBmSelectEq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mocks.mockBmIn).toHaveBeenCalledWith('feed_item_id', ['item-1', 'item-2', 'item-3']);
    expect(result).toEqual({ 'item-1': true, 'item-3': true });
  });

  it('returns empty record when no bookmarks found', async () => {
    mocks.mockBmIn.mockResolvedValue({ data: [], error: null });
    const result = await fetchUserBookmarks('user-123', ['item-1']);
    expect(result).toEqual({});
  });

  it('returns empty record when data is null', async () => {
    mocks.mockBmIn.mockResolvedValue({ data: null, error: null });
    const result = await fetchUserBookmarks('user-123', ['item-1']);
    expect(result).toEqual({});
  });

  it('throws on supabase error', async () => {
    mocks.mockBmIn.mockResolvedValue({ data: null, error: new Error('Fetch failed') });
    await expect(fetchUserBookmarks('user-123', ['item-1'])).rejects.toThrow('Fetch failed');
  });

  it('batches large feedItemIds into chunks of 40', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    mocks.mockBmIn.mockResolvedValue({
      data: [{ feed_item_id: 'item-0' }],
      error: null,
    });
    const result = await fetchUserBookmarks('user-123', ids);
    expect(mocks.mockBmIn).toHaveBeenCalledTimes(2);
    expect(result['item-0']).toBe(true);
  });
});

describe('fetchBookmarkedFeed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches bookmarked items ordered by created_at DESC', async () => {
    mocks.mockBmRange.mockResolvedValue({
      data: [{ created_at: '2024-01-01T00:00:00Z', news_feed: mockNewsFeedItem }],
      error: null,
    });
    const result = await fetchBookmarkedFeed('user-123', 0, 15);
    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_bookmarks');
    expect(mocks.mockBmSelectEq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mocks.mockBmOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mocks.mockBmRange).toHaveBeenCalledWith(0, 14);
    expect(result).toEqual([mockNewsFeedItem]);
  });

  it('paginates with correct range', async () => {
    mocks.mockBmRange.mockResolvedValue({ data: [], error: null });
    await fetchBookmarkedFeed('user-123', 15, 15);
    expect(mocks.mockBmRange).toHaveBeenCalledWith(15, 29);
  });

  it('returns empty array when data is null', async () => {
    mocks.mockBmRange.mockResolvedValue({ data: null, error: null });
    const result = await fetchBookmarkedFeed('user-123');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mocks.mockBmRange.mockResolvedValue({ data: null, error: new Error('DB error') });
    await expect(fetchBookmarkedFeed('user-123')).rejects.toThrow('DB error');
  });
});
