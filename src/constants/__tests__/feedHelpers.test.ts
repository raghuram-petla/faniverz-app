import { colors } from '@/theme/colors';
import { FEED_CONTENT_TYPE_COLORS } from '@shared/constants';
import {
  FEED_PILLS,
  getFeedTypeColor,
  getFeedTypeLabel,
  getFeedTypeIconName,
  getYouTubeThumbnail,
  deriveEntityType,
  getEntityAvatarUrl,
  getEntityName,
  getEntityId,
} from '../feedHelpers';
import { formatRelativeTime } from '@/utils/formatDate';
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
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 0,
  downvote_count: 0,
  view_count: 0,
  comment_count: 0,
  bookmark_count: 0,
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
  it('delegates to FEED_CONTENT_TYPE_COLORS for known content types', () => {
    // Each known type should return the value from the shared map
    expect(getFeedTypeColor('trailer')).toBe(FEED_CONTENT_TYPE_COLORS['trailer']);
    expect(getFeedTypeColor('teaser')).toBe(FEED_CONTENT_TYPE_COLORS['teaser']);
    expect(getFeedTypeColor('glimpse')).toBe(FEED_CONTENT_TYPE_COLORS['glimpse']);
    expect(getFeedTypeColor('promo')).toBe(FEED_CONTENT_TYPE_COLORS['promo']);
    expect(getFeedTypeColor('song')).toBe(FEED_CONTENT_TYPE_COLORS['song']);
    expect(getFeedTypeColor('poster')).toBe(FEED_CONTENT_TYPE_COLORS['poster']);
    expect(getFeedTypeColor('backdrop')).toBe(FEED_CONTENT_TYPE_COLORS['backdrop']);
    expect(getFeedTypeColor('bts')).toBe(FEED_CONTENT_TYPE_COLORS['bts']);
    expect(getFeedTypeColor('interview')).toBe(FEED_CONTENT_TYPE_COLORS['interview']);
    expect(getFeedTypeColor('event')).toBe(FEED_CONTENT_TYPE_COLORS['event']);
    expect(getFeedTypeColor('making')).toBe(FEED_CONTENT_TYPE_COLORS['making']);
    expect(getFeedTypeColor('short-film')).toBe(FEED_CONTENT_TYPE_COLORS['short-film']);
    expect(getFeedTypeColor('update')).toBe(FEED_CONTENT_TYPE_COLORS['update']);
    expect(getFeedTypeColor('new_movie')).toBe(FEED_CONTENT_TYPE_COLORS['new_movie']);
    expect(getFeedTypeColor('theatrical_release')).toBe(
      FEED_CONTENT_TYPE_COLORS['theatrical_release'],
    );
    expect(getFeedTypeColor('ott_release')).toBe(FEED_CONTENT_TYPE_COLORS['ott_release']);
    expect(getFeedTypeColor('rating_milestone')).toBe(FEED_CONTENT_TYPE_COLORS['rating_milestone']);
  });

  it('returns red600 as fallback for unknown content types', () => {
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
    expect(getFeedTypeLabel('backdrop')).toBe('Backdrop');
    expect(getFeedTypeLabel('bts')).toBe('BTS');
    expect(getFeedTypeLabel('interview')).toBe('Interview');
    expect(getFeedTypeLabel('event')).toBe('Event');
    expect(getFeedTypeLabel('making')).toBe('Making');
    expect(getFeedTypeLabel('short-film')).toBe('Short Film');
    expect(getFeedTypeLabel('update')).toBe('Update');
    expect(getFeedTypeLabel('promo')).toBe('Promo');
  });

  it('returns correct labels for update content types', () => {
    expect(getFeedTypeLabel('new_movie')).toBe('New Movie');
    expect(getFeedTypeLabel('theatrical_release')).toBe('In Theaters');
    expect(getFeedTypeLabel('ott_release')).toBe('Now Streaming');
    expect(getFeedTypeLabel('rating_milestone')).toBe('Milestone');
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

  it('returns play-circle for glimpse and promo', () => {
    expect(getFeedTypeIconName('glimpse')).toBe('play-circle');
    expect(getFeedTypeIconName('promo')).toBe('play-circle');
  });

  it('returns film for short-film', () => {
    expect(getFeedTypeIconName('short-film')).toBe('film');
  });

  it('returns star for new_movie', () => {
    expect(getFeedTypeIconName('new_movie')).toBe('star');
  });

  it('returns ticket for theatrical_release', () => {
    expect(getFeedTypeIconName('theatrical_release')).toBe('ticket');
  });

  it('returns tv for ott_release', () => {
    expect(getFeedTypeIconName('ott_release')).toBe('tv');
  });

  it('returns trophy for rating_milestone', () => {
    expect(getFeedTypeIconName('rating_milestone')).toBe('trophy');
  });

  it('returns newspaper as fallback', () => {
    expect(getFeedTypeIconName('unknown')).toBe('newspaper');
  });
});

describe('getYouTubeThumbnail', () => {
  it('constructs correct YouTube thumbnail URL with default quality', () => {
    expect(getYouTubeThumbnail('abc123')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
  });

  it('constructs correct URL with mqdefault quality', () => {
    expect(getYouTubeThumbnail('abc123', 'mqdefault')).toBe(
      'https://img.youtube.com/vi/abc123/mqdefault.jpg',
    );
  });

  it('constructs correct URL with maxresdefault quality', () => {
    expect(getYouTubeThumbnail('abc123', 'maxresdefault')).toBe(
      'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
    );
  });

  it('constructs correct URL with default quality', () => {
    expect(getYouTubeThumbnail('abc123', 'default')).toBe(
      'https://img.youtube.com/vi/abc123/default.jpg',
    );
  });

  it('sanitizes special characters from youtubeId', () => {
    expect(getYouTubeThumbnail('abc/../evil')).toBe(
      'https://img.youtube.com/vi/abcevil/hqdefault.jpg',
    );
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

  it('returns actor when source_table is actors', () => {
    expect(deriveEntityType(makeFeedItem({ movie_id: null, source_table: 'actors' }))).toBe(
      'actor',
    );
  });

  it('returns production_house when source_table is production_houses', () => {
    expect(
      deriveEntityType(makeFeedItem({ movie_id: null, source_table: 'production_houses' })),
    ).toBe('production_house');
  });

  it('returns movie as default when no entity IDs set', () => {
    expect(deriveEntityType(makeFeedItem({ movie_id: null }))).toBe('movie');
  });

  it('prioritizes movie_id over source_table', () => {
    expect(deriveEntityType(makeFeedItem({ movie_id: 'm1', source_table: 'actors' }))).toBe(
      'movie',
    );
  });
});

describe('getEntityAvatarUrl', () => {
  it('returns movie poster_url when movie_id is set', () => {
    expect(getEntityAvatarUrl(makeFeedItem())).toBe('poster.jpg');
  });

  it('returns null when movie has no poster', () => {
    const item = makeFeedItem({
      movie: { id: 'm1', title: 'Movie', poster_url: null, release_date: null },
    });
    expect(getEntityAvatarUrl(item)).toBeNull();
  });

  it('returns thumbnail_url for actor items', () => {
    const item = makeFeedItem({
      movie_id: null,
      movie: undefined,
      source_table: 'actors',
      source_id: 'a1',
      thumbnail_url: 'actor-photo.jpg',
    });
    expect(getEntityAvatarUrl(item)).toBe('actor-photo.jpg');
  });

  it('returns null for non-movie items without thumbnail', () => {
    const item = makeFeedItem({
      movie_id: null,
      movie: undefined,
      source_table: 'actors',
      source_id: 'a1',
      thumbnail_url: null,
    });
    expect(getEntityAvatarUrl(item)).toBeNull();
  });
});

describe('getEntityName', () => {
  it('returns movie title when movie_id is set', () => {
    expect(getEntityName(makeFeedItem())).toBe('Test Movie');
  });

  it('returns Unknown when movie_id is set but movie is missing', () => {
    expect(getEntityName(makeFeedItem({ movie: undefined }))).toBe('Unknown');
  });

  it('returns item title for non-movie items', () => {
    const item = makeFeedItem({
      movie_id: null,
      movie: undefined,
      source_table: 'actors',
      title: 'Allu Arjun',
    });
    expect(getEntityName(item)).toBe('Allu Arjun');
  });

  it('returns Unknown for non-movie items with null title', () => {
    const item = makeFeedItem({
      movie_id: null,
      movie: undefined,
      source_table: 'actors',
      title: null as unknown as string,
    });
    expect(getEntityName(item)).toBe('Unknown');
  });
});

describe('getEntityId', () => {
  it('returns movie_id when set', () => {
    expect(getEntityId(makeFeedItem({ movie_id: 'm1' }))).toBe('m1');
  });

  it('returns source_id for actor items', () => {
    expect(
      getEntityId(makeFeedItem({ movie_id: null, source_table: 'actors', source_id: 'a1' })),
    ).toBe('a1');
  });

  it('returns source_id for production_house items', () => {
    expect(
      getEntityId(
        makeFeedItem({ movie_id: null, source_table: 'production_houses', source_id: 'ph1' }),
      ),
    ).toBe('ph1');
  });

  it('returns null when no movie_id and no source_id', () => {
    expect(getEntityId(makeFeedItem({ movie_id: null }))).toBeNull();
  });

  it('returns null when source_id is set but source_table is null', () => {
    expect(
      getEntityId(makeFeedItem({ movie_id: null, source_table: null, source_id: 'orphan-1' })),
    ).toBeNull();
  });
});
