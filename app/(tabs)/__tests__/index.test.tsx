jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: {
      red600: '#dc2626',
      white: '#fff',
      gray500: '#6b7280',
      green500: '#22c55e',
      green600_20: 'rgba(22,163,74,0.2)',
      red500: '#ef4444',
      red600_20: 'rgba(220,38,38,0.2)',
    },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/feed', () => ({
  usePersonalizedFeed: jest.fn(),
  useVoteFeedItem: jest.fn(),
  useRemoveFeedVote: jest.fn(),
  useUserVotes: jest.fn(),
  useEntityFollows: jest.fn(),
  useFollowEntity: jest.fn(),
  useUnfollowEntity: jest.fn(),
}));

jest.mock('@/stores/useFeedStore', () => ({
  useFeedStore: jest.fn(),
}));

jest.mock('@/components/feed/FeedHeader', () => ({
  FeedHeader: () => null,
  useCollapsibleHeader: () => ({
    headerTranslateY: { setValue: jest.fn() },
    totalHeaderHeight: 99,
    handleScroll: jest.fn(),
  }),
}));

jest.mock('@/components/feed/FeedFilterPills', () => ({
  FeedFilterPills: () => null,
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends Function>(fn: T) => fn, isAuthenticated: true }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'current-user-id' } }),
}));

jest.mock('@/hooks/useActiveVideo', () => ({
  useActiveVideo: () => ({
    activeVideoId: null,
    registerVideoLayout: jest.fn(),
    handleScrollForVideo: jest.fn(),
  }),
}));

jest.mock('@/components/feed/FeedCard', () => ({
  FeedCard: ({ item, onUpvote, onDownvote }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <Text>{item.title}</Text>
        {item.is_pinned ? <Text>Pinned</Text> : null}
        {item.is_featured ? <Text>Featured</Text> : null}
        {onUpvote && (
          <TouchableOpacity
            onPress={() => onUpvote(item.id)}
            accessibilityLabel={`Upvote ${item.title}`}
          >
            <Text>Upvote</Text>
          </TouchableOpacity>
        )}
        {onDownvote && (
          <TouchableOpacity
            onPress={() => onDownvote(item.id)}
            accessibilityLabel={`Downvote ${item.title}`}
          >
            <Text>Downvote</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FeedScreen from '../index';
import {
  usePersonalizedFeed,
  useVoteFeedItem,
  useRemoveFeedVote,
  useUserVotes,
  useEntityFollows,
  useFollowEntity,
  useUnfollowEntity,
} from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';
import type { NewsFeedItem } from '@shared/types';

const mockSetFilter = jest.fn();
const mockFetchNextPage = jest.fn();
const mockVoteMutate = jest.fn();
const mockRemoveMutate = jest.fn();
const mockFollowMutate = jest.fn();
const mockUnfollowMutate = jest.fn();

const mockUseEntityFollows = useEntityFollows as jest.MockedFunction<typeof useEntityFollows>;
const mockUseFollowEntity = useFollowEntity as jest.MockedFunction<typeof useFollowEntity>;
const mockUseUnfollowEntity = useUnfollowEntity as jest.MockedFunction<typeof useUnfollowEntity>;

const mockUsePersonalizedFeed = usePersonalizedFeed as jest.MockedFunction<
  typeof usePersonalizedFeed
>;
const mockUseVoteFeedItem = useVoteFeedItem as jest.MockedFunction<typeof useVoteFeedItem>;
const mockUseRemoveFeedVote = useRemoveFeedVote as jest.MockedFunction<typeof useRemoveFeedVote>;
const mockUseUserVotes = useUserVotes as jest.MockedFunction<typeof useUserVotes>;
const mockUseFeedStore = useFeedStore as jest.MockedFunction<typeof useFeedStore>;

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: 'item-1',
    feed_type: 'video',
    content_type: 'trailer',
    title: 'Test Item',
    description: null,
    movie_id: 'movie-1',
    source_table: 'movie_videos',
    source_id: 'src-1',
    thumbnail_url: 'https://example.com/thumb.jpg',
    youtube_id: 'abc123',
    is_pinned: false,
    is_featured: false,
    display_order: 0,
    upvote_count: 5,
    downvote_count: 1,
    view_count: 0,
    comment_count: 0,
    published_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    movie: { id: 'movie-1', title: 'Test Movie', poster_url: null, release_date: null },
    ...overrides,
  };
}

function setupMocks(
  overrides: {
    store?: Partial<ReturnType<typeof useFeedStore>>;
    feed?: Record<string, unknown>;
    votes?: Record<string, 'up' | 'down'>;
  } = {},
) {
  mockUseFeedStore.mockReturnValue({
    filter: 'all',
    setFilter: mockSetFilter,
    ...overrides.store,
  } as any);

  mockUsePersonalizedFeed.mockReturnValue({
    data: { pages: [[makeItem()]], pageParams: [0] },
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    isFetchingNextPage: false,
    ...overrides.feed,
  } as any);

  mockUseVoteFeedItem.mockReturnValue({
    mutate: mockVoteMutate,
  } as any);

  mockUseRemoveFeedVote.mockReturnValue({
    mutate: mockRemoveMutate,
  } as any);

  mockUseUserVotes.mockReturnValue({
    data: overrides.votes ?? {},
  } as any);

  mockUseEntityFollows.mockReturnValue({
    followSet: new Set<string>(),
  } as any);

  mockUseFollowEntity.mockReturnValue({
    mutate: mockFollowMutate,
  } as any);

  mockUseUnfollowEntity.mockReturnValue({
    mutate: mockUnfollowMutate,
  } as any);
}

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders skeleton when loading', () => {
    setupMocks({ feed: { data: undefined, isLoading: true } });
    render(<FeedScreen />);
    expect(screen.getByTestId('feed-content-skeleton')).toBeTruthy();
  });

  it('renders empty state when no items', () => {
    setupMocks({ feed: { data: { pages: [[]], pageParams: [0] }, isLoading: false } });
    render(<FeedScreen />);
    expect(screen.getByText('No updates yet')).toBeTruthy();
    expect(
      screen.getByText('Check back soon for trailers, posters, and exclusive content!'),
    ).toBeTruthy();
  });

  it('renders feed items when data exists', () => {
    const items = [
      makeItem({ id: 'item-1', title: 'First Trailer' }),
      makeItem({ id: 'item-2', title: 'Second Trailer' }),
    ];
    setupMocks({ feed: { data: { pages: [items], pageParams: [0] }, isLoading: false } });
    render(<FeedScreen />);
    expect(screen.getByText('First Trailer')).toBeTruthy();
    expect(screen.getByText('Second Trailer')).toBeTruthy();
  });

  it('renders pinned and featured indicators in stream', () => {
    const items = [
      makeItem({ id: 'p1', title: 'Pinned Post', is_pinned: true }),
      makeItem({ id: 'f1', title: 'Featured Post', is_featured: true }),
    ];
    setupMocks({ feed: { data: { pages: [items], pageParams: [0] }, isLoading: false } });
    render(<FeedScreen />);
    expect(screen.getByText('Pinned')).toBeTruthy();
    expect(screen.getByText('Featured')).toBeTruthy();
  });

  it('calls fetchNextPage on scroll near bottom when hasNextPage is true', () => {
    setupMocks({ feed: { hasNextPage: true, isFetchingNextPage: false } });
    render(<FeedScreen />);
    const { ScrollView } = require('react-native');
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        layoutMeasurement: { height: 800 },
        contentOffset: { y: 900 },
        contentSize: { height: 1100 },
      },
    });
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('does not call fetchNextPage when already fetching next page', () => {
    setupMocks({ feed: { hasNextPage: true, isFetchingNextPage: true } });
    render(<FeedScreen />);
    const { ScrollView } = require('react-native');
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        layoutMeasurement: { height: 800 },
        contentOffset: { y: 900 },
        contentSize: { height: 1100 },
      },
    });
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('does not call fetchNextPage when hasNextPage is false', () => {
    setupMocks({ feed: { hasNextPage: false, isFetchingNextPage: false } });
    render(<FeedScreen />);
    const { ScrollView } = require('react-native');
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        layoutMeasurement: { height: 800 },
        contentOffset: { y: 900 },
        contentSize: { height: 1100 },
      },
    });
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('upvote button triggers vote mutation when no existing vote', () => {
    setupMocks({ votes: {} });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Upvote Test Item'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'item-1',
      voteType: 'up',
      previousVote: null,
    });
  });

  it('upvote button triggers remove mutation when already upvoted', () => {
    setupMocks({ votes: { 'item-1': 'up' } });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Upvote Test Item'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      feedItemId: 'item-1',
      previousVote: 'up',
    });
  });

  it('downvote button triggers vote mutation when no existing vote', () => {
    setupMocks({ votes: {} });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Downvote Test Item'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'item-1',
      voteType: 'down',
      previousVote: null,
    });
  });

  it('downvote button triggers remove mutation when already downvoted', () => {
    setupMocks({ votes: { 'item-1': 'down' } });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Downvote Test Item'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      feedItemId: 'item-1',
      previousVote: 'down',
    });
  });

  it('renders isFetchingNextPage indicator at the bottom', () => {
    setupMocks({ feed: { isFetchingNextPage: true } });
    const { UNSAFE_getAllByType } = render(<FeedScreen />);
    const { ActivityIndicator } = require('react-native');
    const indicators = UNSAFE_getAllByType(ActivityIndicator);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('passes filter to usePersonalizedFeed', () => {
    setupMocks({ store: { filter: 'songs' } });
    render(<FeedScreen />);
    expect(mockUsePersonalizedFeed).toHaveBeenCalledWith('songs');
  });

  it('handles empty pages array gracefully', () => {
    setupMocks({ feed: { data: { pages: [], pageParams: [] }, isLoading: false } });
    render(<FeedScreen />);
    expect(screen.getByText('No updates yet')).toBeTruthy();
  });

  it('deduplicates items across paginated pages', () => {
    const item = makeItem({ id: 'dup-1', title: 'Duplicate' });
    setupMocks({
      feed: { data: { pages: [[item], [item]], pageParams: [0, 15] }, isLoading: false },
    });
    render(<FeedScreen />);
    expect(screen.getAllByText('Duplicate')).toHaveLength(1);
  });
});
