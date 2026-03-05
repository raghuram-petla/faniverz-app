jest.mock('@/lib/supabase', () => {
  const mockRange = jest.fn();
  const mockLimit = jest.fn();
  const mockIn = jest.fn(() => ({ range: mockRange }));
  const mockEq2 = jest.fn(() => ({ in: mockIn, range: mockRange }));
  const mockEq = jest.fn(() => ({ eq: mockEq2, in: mockIn, range: mockRange }));
  const mockOrder2 = jest.fn(() => ({ eq: mockEq, in: mockIn, range: mockRange }));
  const mockOrder = jest.fn(() => ({
    order: mockOrder2,
    eq: mockEq,
    in: mockIn,
    range: mockRange,
  }));
  const mockSelect = jest.fn(() => ({ order: mockOrder, eq: mockEq }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    supabase: {
      from: mockFrom,
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
      },
    },
  };
});

import { fetchNewsFeed, fetchFeaturedFeedItems } from '../api';
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
  duration: '2:30',
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
    expect(mocks.mockEq).toHaveBeenCalledWith('feed_type', 'poster');
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

  it('paginates with correct range', async () => {
    await fetchNewsFeed('all', 2, 15);
    expect(mocks.mockRange).toHaveBeenCalledWith(30, 44);
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

describe('fetchFeaturedFeedItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.mockLimit.mockResolvedValue({ data: [mockItem], error: null });
    // Re-wire the chain for featured query
    mocks.mockOrder.mockReturnValue({ limit: mocks.mockLimit });
    mocks.mockEq.mockReturnValue({ order: mocks.mockOrder });
    mocks.mockSelect.mockReturnValue({ eq: mocks.mockEq });
  });

  it('fetches featured items', async () => {
    const result = await fetchFeaturedFeedItems();
    expect(mocks.mockFrom).toHaveBeenCalledWith('news_feed');
    expect(mocks.mockEq).toHaveBeenCalledWith('is_featured', true);
    expect(result).toEqual([mockItem]);
  });

  it('throws on supabase error', async () => {
    mocks.mockLimit.mockResolvedValue({ data: null, error: new Error('fail') });
    await expect(fetchFeaturedFeedItems()).rejects.toThrow('fail');
  });
});
