import { colors } from '@/theme/colors';
import {
  FEED_PILLS,
  getFeedTypeColor,
  getFeedTypeLabel,
  getFeedTypeIconName,
  getYouTubeThumbnail,
  formatRelativeTime,
  deriveEntityType,
  getEntityAvatarUrl,
  getEntityName,
} from '../feedHelpers';
import type { NewsFeedItem } from '@shared/types';

const makeFeedItem = (overrides: Partial<NewsFeedItem> = {}): NewsFeedItem => ({
  id: '1',
  feed_type: 'video',
  content_type: 'trailer',
  title: 'Test',
  description: null,
  movie_id: 'm1',
  source_table: null,
  source_id: null,
  thumbnail_url: null,
  youtube_id: null,
  duration: null,
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 0,
  downvote_count: 0,
  view_count: 0,
  comment_count: 0,
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  movie: { id: 'm1', title: 'Test Movie', poster_url: 'poster.jpg', release_date: null },
  ...overrides,
});

describe('FEED_PILLS', () => {
  it('has 7 filter options', () => {
    expect(FEED_PILLS).toHaveLength(7);
  });

  it('starts with All filter', () => {
    expect(FEED_PILLS[0].value).toBe('all');
    expect(FEED_PILLS[0].label).toBe('All');
  });

  it('has correct structure for each pill', () => {
    for (const pill of FEED_PILLS) {
      expect(pill).toHaveProperty('label');
      expect(pill).toHaveProperty('value');
      expect(pill).toHaveProperty('activeColor');
    }
  });
});

describe('getFeedTypeColor', () => {
  it('returns blue for trailer types', () => {
    expect(getFeedTypeColor('trailer')).toBe(colors.blue600);
    expect(getFeedTypeColor('teaser')).toBe(colors.blue600);
    expect(getFeedTypeColor('glimpse')).toBe(colors.blue600);
    expect(getFeedTypeColor('promo')).toBe(colors.blue600);
  });

  it('returns purple for songs', () => {
    expect(getFeedTypeColor('song')).toBe(colors.purple600);
  });

  it('returns green for posters', () => {
    expect(getFeedTypeColor('poster')).toBe(colors.green500);
  });

  it('returns orange for BTS types', () => {
    expect(getFeedTypeColor('bts')).toBe(colors.orange500);
    expect(getFeedTypeColor('interview')).toBe(colors.orange500);
    expect(getFeedTypeColor('event')).toBe(colors.orange500);
    expect(getFeedTypeColor('making')).toBe(colors.orange500);
  });

  it('returns pink for short films', () => {
    expect(getFeedTypeColor('short-film')).toBe(colors.pink600);
  });

  it('returns gray for updates', () => {
    expect(getFeedTypeColor('update')).toBe(colors.gray500);
  });

  it('returns red as fallback', () => {
    expect(getFeedTypeColor('unknown')).toBe(colors.red600);
  });
});

describe('getFeedTypeLabel', () => {
  it('returns correct labels', () => {
    expect(getFeedTypeLabel('trailer')).toBe('Trailer');
    expect(getFeedTypeLabel('teaser')).toBe('Teaser');
    expect(getFeedTypeLabel('glimpse')).toBe('Glimpse');
    expect(getFeedTypeLabel('song')).toBe('Song');
    expect(getFeedTypeLabel('poster')).toBe('Poster');
    expect(getFeedTypeLabel('bts')).toBe('BTS');
    expect(getFeedTypeLabel('interview')).toBe('Interview');
    expect(getFeedTypeLabel('event')).toBe('Event');
    expect(getFeedTypeLabel('making')).toBe('Making');
    expect(getFeedTypeLabel('short-film')).toBe('Short Film');
    expect(getFeedTypeLabel('update')).toBe('Update');
    expect(getFeedTypeLabel('promo')).toBe('Promo');
  });

  it('returns raw value for unknown types', () => {
    expect(getFeedTypeLabel('custom')).toBe('custom');
  });
});

describe('getFeedTypeIconName', () => {
  it('returns play-circle for video trailer types', () => {
    expect(getFeedTypeIconName('trailer')).toBe('play-circle');
    expect(getFeedTypeIconName('teaser')).toBe('play-circle');
  });

  it('returns musical-notes for songs', () => {
    expect(getFeedTypeIconName('song')).toBe('musical-notes');
  });

  it('returns image for posters', () => {
    expect(getFeedTypeIconName('poster')).toBe('image');
  });

  it('returns videocam for bts/making', () => {
    expect(getFeedTypeIconName('bts')).toBe('videocam');
    expect(getFeedTypeIconName('making')).toBe('videocam');
  });

  it('returns mic for interview/event', () => {
    expect(getFeedTypeIconName('interview')).toBe('mic');
    expect(getFeedTypeIconName('event')).toBe('mic');
  });

  it('returns megaphone for updates', () => {
    expect(getFeedTypeIconName('update')).toBe('megaphone');
  });

  it('returns newspaper as fallback', () => {
    expect(getFeedTypeIconName('unknown')).toBe('newspaper');
  });
});

describe('getYouTubeThumbnail', () => {
  it('constructs correct YouTube thumbnail URL', () => {
    expect(getYouTubeThumbnail('abc123')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
  });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago for recent times', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('returns weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoWeeksAgo)).toBe('2w ago');
  });

  it('returns date for old timestamps', () => {
    const result = formatRelativeTime('2024-01-15T00:00:00Z');
    expect(result).toMatch(/\d{1,2} \w{3}/);
  });
});

describe('deriveEntityType', () => {
  it('returns movie when movie_id is set', () => {
    expect(deriveEntityType(makeFeedItem({ movie_id: 'm1' }))).toBe('movie');
  });

  it('returns movie as default when no entity IDs set', () => {
    expect(deriveEntityType(makeFeedItem({ movie_id: null }))).toBe('movie');
  });
});

describe('getEntityAvatarUrl', () => {
  it('returns movie poster_url when available', () => {
    expect(getEntityAvatarUrl(makeFeedItem())).toBe('poster.jpg');
  });

  it('returns null when no movie', () => {
    expect(getEntityAvatarUrl(makeFeedItem({ movie: undefined }))).toBeNull();
  });

  it('returns null when movie has no poster', () => {
    const item = makeFeedItem({
      movie: { id: 'm1', title: 'Movie', poster_url: null, release_date: null },
    });
    expect(getEntityAvatarUrl(item)).toBeNull();
  });
});

describe('getEntityName', () => {
  it('returns movie title when available', () => {
    expect(getEntityName(makeFeedItem())).toBe('Test Movie');
  });

  it('returns Unknown when no movie', () => {
    expect(getEntityName(makeFeedItem({ movie: undefined }))).toBe('Unknown');
  });
});
