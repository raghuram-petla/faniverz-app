import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeedEditorialCard, FeedEditorialCardInner } from '../FeedEditorialCard';
import type { NewsFeedItem } from '@shared/types';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#666',
      textDisabled: '#444',
      surfaceElevated: '#111',
      borderSubtle: '#333',
      surface: '#111',
      background: '#000',
    },
    colors: { yellow400: '#FACC15', red600: '#DC2626' },
    isDark: true,
  }),
}));

jest.mock('expo-image', () => ({
  Image: 'ExpoImage',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useRelativeTime', () => ({
  useRelativeTime: () => '2h ago',
}));

jest.mock('@/constants/feedHelpers', () => ({
  getEntityAvatarUrl: () => 'https://avatar.url',
  getEntityName: () => 'Test Movie',
  getEntityId: () => 'entity-1',
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
  posterBucket: () => 'POSTERS',
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.poster',
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedCardStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../FeedAvatar', () => ({ FeedAvatar: 'FeedAvatar' }));
jest.mock('../FeedActionBar', () => ({ FeedActionBar: 'FeedActionBar' }));
jest.mock('../FeedContentBadge', () => ({ FeedContentBadge: 'FeedContentBadge' }));
jest.mock('../FollowButton', () => ({ FollowButton: 'FollowButton' }));
jest.mock('../FilmStripFrame', () => ({
  FilmStripFrame: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="film-strip-frame">{children}</View>;
  },
}));
jest.mock('../FilmStripFrameDivider', () => ({
  FilmStripFrameDivider: 'FilmStripFrameDivider',
}));

const makeItem = (overrides: Partial<NewsFeedItem> = {}): NewsFeedItem => ({
  id: 'feed-1',
  feed_type: 'editorial',
  content_type: 'editorial_review',
  title: 'Editorial Review: Test Movie',
  description: 'A brilliant cinematic achievement with stunning performances.',
  movie_id: 'movie-1',
  source_table: 'editorial_reviews',
  source_id: 'er-1',
  thumbnail_url: 'https://example.com/poster.jpg',
  youtube_id: null,
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 10,
  comment_count: 3,
  bookmark_count: 2,
  editorial_rating: 4.5,
  published_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  movie: { id: 'movie-1', title: 'Test Movie', poster_url: null, release_date: null },
  ...overrides,
});

const defaultProps = {
  item: makeItem(),
  onPress: jest.fn(),
  onEntityPress: jest.fn(),
  userVote: null as 'up' | 'down' | null,
  isBookmarked: false,
  onUpvote: jest.fn(),
  onDownvote: jest.fn(),
  onBookmark: jest.fn(),
  onComment: jest.fn(),
  onShare: jest.fn(),
  isFollowing: false,
  onFollow: jest.fn(),
  onUnfollow: jest.fn(),
  isFirst: false,
};

describe('FeedEditorialCardInner', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the editorial rating', () => {
    render(<FeedEditorialCardInner {...defaultProps} />);
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('/ 5')).toBeTruthy();
  });

  it('renders description text', () => {
    render(<FeedEditorialCardInner {...defaultProps} />);
    expect(
      screen.getByText('A brilliant cinematic achievement with stunning performances.'),
    ).toBeTruthy();
  });

  it('renders "Read Full Review" CTA', () => {
    render(<FeedEditorialCardInner {...defaultProps} />);
    expect(screen.getByText(/Read Full Review/)).toBeTruthy();
  });

  it('renders entity name', () => {
    render(<FeedEditorialCardInner {...defaultProps} />);
    expect(screen.getByText('Test Movie')).toBeTruthy();
  });

  it('renders relative time', () => {
    render(<FeedEditorialCardInner {...defaultProps} />);
    expect(screen.getByText('2h ago')).toBeTruthy();
  });

  it('does not render rating when editorial_rating is null', () => {
    render(
      <FeedEditorialCardInner {...defaultProps} item={makeItem({ editorial_rating: null })} />,
    );
    expect(screen.queryByText('4.5')).toBeNull();
    expect(screen.getByText(/Read Full Review/)).toBeTruthy();
  });

  it('does not render description when null', () => {
    render(<FeedEditorialCardInner {...defaultProps} item={makeItem({ description: null })} />);
    expect(screen.queryByText('A brilliant cinematic achievement')).toBeNull();
  });
});

describe('FeedEditorialCard memo', () => {
  it('exports a memoized component', () => {
    expect(FeedEditorialCard).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((FeedEditorialCard as any).compare).toBeDefined();
  });
});
