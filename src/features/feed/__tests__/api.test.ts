jest.mock('@/lib/supabase', () => {
  const mockRange = jest.fn();
  const mockLimit = jest.fn();
  const mockIn = jest.fn(() => ({ range: mockRange }));
  const mockEq2 = jest.fn(() => ({ in: mockIn, range: mockRange }));
  const mockFeedSingle = jest.fn();
  const mockEq = jest.fn(() => ({
    eq: mockEq2,
    in: mockIn,
    range: mockRange,
    single: mockFeedSingle,
  }));
  const mockOrder2 = jest.fn(() => ({ eq: mockEq, in: mockIn, range: mockRange }));
  const mockOrder = jest.fn(() => ({
    order: mockOrder2,
    eq: mockEq,
    in: mockIn,
    range: mockRange,
  }));
  const mockSelect = jest.fn(() => ({ order: mockOrder, eq: mockEq }));

  // Vote chain mocks
  const mockSingle = jest.fn();
  const mockUpsertSelect = jest.fn(() => ({ single: mockSingle }));
  const mockUpsert = jest.fn(() => ({ select: mockUpsertSelect }));
  const mockDeleteEq2 = jest.fn();
  const mockDeleteEq = jest.fn(() => ({ eq: mockDeleteEq2 }));
  const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));
  const mockVoteIn = jest.fn();
  const mockVoteEq = jest.fn(() => ({ in: mockVoteIn }));
  const mockVoteSelect = jest.fn(() => ({ eq: mockVoteEq }));

  const mockFrom = jest.fn((table: string) => {
    if (table === 'feed_votes') {
      return {
        upsert: mockUpsert,
        delete: mockDelete,
        select: mockVoteSelect,
      };
    }
    return { select: mockSelect };
  });

  const mockRpc = jest.fn();

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
      __mocks: {
        mockFrom,
        mockSelect,
        mockOrder,
        mockOrder2,
        mockEq,
        mockEq2,
        mockIn,
        mockRange,
        mockLimit,
        mockRpc,
        mockUpsert,
        mockUpsertSelect,
        mockSingle,
        mockDelete,
        mockDeleteEq,
        mockDeleteEq2,
        mockVoteSelect,
        mockVoteEq,
        mockVoteIn,
        mockFeedSingle,
      },
    },
  };
});

import {
  fetchNewsFeed,
  fetchPersonalizedFeed,
  fetchFeedItemById,
  voteFeedItem,
  removeFeedVote,
  fetchUserVotes,
} from '../api';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocks = (supabase as any).__mocks;

const mockItem = {
  id: '1',
  feed_type: 'video',
  content_type: 'trailer',
  title: 'Test Trailer',
  description: null,
  movie_id: 'm1',
  source_table: 'movie_videos',
  source_id: 'v1',
  thumbnail_url: 'https://img.youtube.com/vi/abc/hqdefault.jpg',
  youtube_id: 'abc',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  movie: { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2024-03-01' },
};

describe('fetchNewsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.mockRange.mockResolvedValue({ data: [mockItem], error: null });
  });

  it('fetches all feed items when no filter', async () => {
    const result = await fetchNewsFeed();
    expect(mocks.mockFrom).toHaveBeenCalledWith('news_feed');
    expect(result).toEqual([mockItem]);
  });

  it('applies trailers filter', async () => {
    await fetchNewsFeed('trailers');
    expect(mocks.mockEq).toHaveBeenCalledWith('feed_type', 'video');
    expect(mocks.mockIn).toHaveBeenCalledWith('content_type', [
      'trailer',
      'teaser',
      'glimpse',
      'promo',
    ]);
  });

  it('applies songs filter', async () => {
    await fetchNewsFeed('songs');
    expect(mocks.mockEq).toHaveBeenCalledWith('content_type', 'song');
  });

  it('applies posters filter', async () => {
    await fetchNewsFeed('posters');
    expect(mocks.mockIn).toHaveBeenCalledWith('feed_type', ['poster', 'backdrop']);
  });

  it('applies bts filter', async () => {
    await fetchNewsFeed('bts');
    expect(mocks.mockIn).toHaveBeenCalledWith('content_type', [
      'bts',
      'interview',
      'event',
      'making',
    ]);
  });

  it('applies surprise filter', async () => {
    await fetchNewsFeed('surprise');
    expect(mocks.mockEq).toHaveBeenCalledWith('feed_type', 'surprise');
  });

  it('applies updates filter', async () => {
    await fetchNewsFeed('updates');
    expect(mocks.mockEq).toHaveBeenCalledWith('feed_type', 'update');
  });

  it('paginates with correct range', async () => {
    await fetchNewsFeed('all', 2, 15);
    expect(mocks.mockRange).toHaveBeenCalledWith(2, 16);
  });

  it('throws on supabase error', async () => {
    mocks.mockRange.mockResolvedValue({ data: null, error: new Error('DB error') });
    await expect(fetchNewsFeed()).rejects.toThrow('DB error');
  });

  it('returns empty array when data is null', async () => {
    mocks.mockRange.mockResolvedValue({ data: null, error: null });
    const result = await fetchNewsFeed();
    expect(result).toEqual([]);
  });
});

describe('fetchPersonalizedFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls supabase.rpc with correct params', async () => {
    const rpcResult = [
      {
        id: 'item-1',
        feed_type: 'video',
        content_type: 'trailer',
        title: 'Personalized Item',
        description: null,
        movie_id: 'm1',
        source_table: 'movie_videos',
        source_id: 'v1',
        thumbnail_url: 'https://example.com/thumb.jpg',
        youtube_id: 'xyz',
        is_pinned: false,
        is_featured: false,
        display_order: 0,
        upvote_count: 10,
        downvote_count: 2,
        view_count: 100,
        comment_count: 5,
        published_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        score: 8,
        movie_title: 'Test Movie',
        movie_poster_url: null,
        movie_release_date: '2024-03-01',
      },
    ];
    mocks.mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const result = await fetchPersonalizedFeed('user-123', 'trailers', 1, 15);

    expect(mocks.mockRpc).toHaveBeenCalledWith('get_personalized_feed', {
      p_user_id: 'user-123',
      p_filter: 'trailers',
      p_limit: 15,
      p_offset: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-1');
    expect(result[0].title).toBe('Personalized Item');
  });

  it('maps response with nested movie object', async () => {
    const rpcResult = [
      {
        id: 'item-2',
        feed_type: 'poster',
        content_type: 'poster',
        title: 'Poster Item',
        description: 'A poster',
        movie_id: 'm2',
        source_table: null,
        source_id: null,
        thumbnail_url: null,
        youtube_id: null,
        is_pinned: true,
        is_featured: false,
        display_order: 1,
        upvote_count: 5,
        downvote_count: 0,
        view_count: 50,
        comment_count: 2,
        published_at: '2024-02-01T00:00:00Z',
        created_at: '2024-02-01T00:00:00Z',
        score: 5,
        movie_title: 'Movie Two',
        movie_poster_url: 'https://example.com/poster.jpg',
        movie_release_date: '2024-06-01',
      },
    ];
    mocks.mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const result = await fetchPersonalizedFeed('user-123');

    expect(result[0].movie).toEqual({
      id: 'm2',
      title: 'Movie Two',
      poster_url: 'https://example.com/poster.jpg',
      poster_image_type: null,
      release_date: '2024-06-01',
    });
  });

  it('returns undefined movie when movie_title is absent', async () => {
    const rpcResult = [
      {
        id: 'item-3',
        feed_type: 'update',
        content_type: 'update',
        title: 'General Update',
        description: null,
        movie_id: null,
        source_table: null,
        source_id: null,
        thumbnail_url: null,
        youtube_id: null,
        is_pinned: false,
        is_featured: false,
        display_order: 0,
        upvote_count: 0,
        downvote_count: 0,
        view_count: 0,
        comment_count: 0,
        published_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        score: 0,
        movie_title: null,
        movie_poster_url: null,
        movie_release_date: null,
      },
    ];
    mocks.mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const result = await fetchPersonalizedFeed(null);
    expect(result[0].movie).toBeUndefined();
  });

  it('passes null userId when not logged in', async () => {
    mocks.mockRpc.mockResolvedValue({ data: [], error: null });
    await fetchPersonalizedFeed(null, 'all', 0, 15);
    expect(mocks.mockRpc).toHaveBeenCalledWith('get_personalized_feed', {
      p_user_id: null,
      p_filter: 'all',
      p_limit: 15,
      p_offset: 0,
    });
  });

  it('throws on supabase error', async () => {
    mocks.mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });
    await expect(fetchPersonalizedFeed('user-123')).rejects.toThrow('RPC failed');
  });

  it('returns empty array when data is null', async () => {
    mocks.mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await fetchPersonalizedFeed('user-123');
    expect(result).toEqual([]);
  });
});

describe('voteFeedItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts to feed_votes with correct params', async () => {
    const voteData = {
      id: 'vote-1',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'up',
      created_at: '2024-01-01T00:00:00Z',
    };
    mocks.mockSingle.mockResolvedValue({ data: voteData, error: null });

    const result = await voteFeedItem('item-1', 'user-123', 'up');

    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_votes');
    expect(mocks.mockUpsert).toHaveBeenCalledWith(
      { feed_item_id: 'item-1', user_id: 'user-123', vote_type: 'up' },
      { onConflict: 'feed_item_id,user_id' },
    );
    expect(result).toEqual(voteData);
  });

  it('handles downvote type', async () => {
    const voteData = {
      id: 'vote-2',
      feed_item_id: 'item-1',
      user_id: 'user-123',
      vote_type: 'down',
      created_at: '2024-01-01T00:00:00Z',
    };
    mocks.mockSingle.mockResolvedValue({ data: voteData, error: null });

    const result = await voteFeedItem('item-1', 'user-123', 'down');

    expect(mocks.mockUpsert).toHaveBeenCalledWith(
      { feed_item_id: 'item-1', user_id: 'user-123', vote_type: 'down' },
      { onConflict: 'feed_item_id,user_id' },
    );
    expect(result.vote_type).toBe('down');
  });

  it('throws on supabase error', async () => {
    mocks.mockSingle.mockResolvedValue({ data: null, error: new Error('Vote failed') });
    await expect(voteFeedItem('item-1', 'user-123', 'up')).rejects.toThrow('Vote failed');
  });
});

describe('removeFeedVote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes from feed_votes with correct params', async () => {
    mocks.mockDeleteEq2.mockResolvedValue({ error: null });

    await removeFeedVote('item-1', 'user-123');

    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_votes');
    expect(mocks.mockDeleteEq).toHaveBeenCalledWith('feed_item_id', 'item-1');
    expect(mocks.mockDeleteEq2).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('throws on supabase error', async () => {
    mocks.mockDeleteEq2.mockResolvedValue({ error: new Error('Delete failed') });
    await expect(removeFeedVote('item-1', 'user-123')).rejects.toThrow('Delete failed');
  });
});

describe('fetchUserVotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when feedItemIds is empty', async () => {
    const result = await fetchUserVotes('user-123', []);
    expect(result).toEqual({});
    expect(mocks.mockFrom).not.toHaveBeenCalledWith('feed_votes');
  });

  it('fetches votes and returns vote map', async () => {
    const voteData = [
      { feed_item_id: 'item-1', vote_type: 'up' },
      { feed_item_id: 'item-2', vote_type: 'down' },
    ];
    mocks.mockVoteIn.mockResolvedValue({ data: voteData, error: null });

    const result = await fetchUserVotes('user-123', ['item-1', 'item-2', 'item-3']);

    expect(mocks.mockFrom).toHaveBeenCalledWith('feed_votes');
    expect(mocks.mockVoteEq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mocks.mockVoteIn).toHaveBeenCalledWith('feed_item_id', ['item-1', 'item-2', 'item-3']);
    expect(result).toEqual({ 'item-1': 'up', 'item-2': 'down' });
  });

  it('returns empty map when no votes found', async () => {
    mocks.mockVoteIn.mockResolvedValue({ data: [], error: null });
    const result = await fetchUserVotes('user-123', ['item-1']);
    expect(result).toEqual({});
  });

  it('returns empty map when data is null', async () => {
    mocks.mockVoteIn.mockResolvedValue({ data: null, error: null });
    const result = await fetchUserVotes('user-123', ['item-1']);
    expect(result).toEqual({});
  });

  it('throws on supabase error', async () => {
    mocks.mockVoteIn.mockResolvedValue({ data: null, error: new Error('Fetch votes failed') });
    await expect(fetchUserVotes('user-123', ['item-1'])).rejects.toThrow('Fetch votes failed');
  });

  it('batches large feedItemIds into chunks of 40', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    mocks.mockVoteIn.mockResolvedValue({
      data: [{ feed_item_id: 'item-0', vote_type: 'up' }],
      error: null,
    });
    const result = await fetchUserVotes('user-123', ids);
    // Should have been called twice: batch of 40 + batch of 10
    expect(mocks.mockVoteIn).toHaveBeenCalledTimes(2);
    expect(result['item-0']).toBe('up');
  });
});

describe('fetchFeedItemById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.mockEq.mockReturnValue({ single: mocks.mockFeedSingle });
  });

  it('fetches a single feed item by id', async () => {
    mocks.mockFeedSingle.mockResolvedValue({ data: mockItem, error: null });
    const result = await fetchFeedItemById('1');
    expect(mocks.mockFrom).toHaveBeenCalledWith('news_feed');
    expect(mocks.mockEq).toHaveBeenCalledWith('id', '1');
    expect(result).toEqual(mockItem);
  });

  it('returns null when item not found (PGRST116)', async () => {
    mocks.mockFeedSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const result = await fetchFeedItemById('missing');
    expect(result).toBeNull();
  });

  it('throws on other errors', async () => {
    mocks.mockFeedSingle.mockResolvedValue({ data: null, error: new Error('DB error') });
    await expect(fetchFeedItemById('1')).rejects.toThrow('DB error');
  });
});
